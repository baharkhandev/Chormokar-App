'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Strikethrough,
  Undo,
  Redo,
  Table as TableIcon,
  Trash2,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Unlink,
  Minus,
  RemoveFormatting,
  X,
  Check,
  AlertCircle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image as TipTapImage } from '@tiptap/extension-image';
import { ResizableNodeView, mergeAttributes } from '@tiptap/core';
import clsx from 'clsx';

/**
 * ResizableImage TipTap Extension
 * Adds corner drag-resizing, aspect ratio preservation, custom widths, and alignments.
 */
export const ResizableImage = TipTapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('width') || element.style.width;
          return width ? parseInt(width, 10) || width : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.getAttribute('height') || element.style.height;
          return height ? parseInt(height, 10) || height : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => ({
          'data-align': attributes.alignment || 'center',
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes['data-align'] || 'center';
    const width = HTMLAttributes.width;

    const styles: string[] = ['max-width: 100%', 'height: auto'];
    if (width) {
      styles.push(`width: ${typeof width === 'number' ? `${width}px` : width}`);
    }
    if (align === 'left') {
      styles.push('display: block', 'margin-left: 0', 'margin-right: auto');
    } else if (align === 'right') {
      styles.push('display: block', 'margin-left: auto', 'margin-right: 0');
    } else {
      styles.push('display: block', 'margin-left: auto', 'margin-right: auto');
    }

    const merged = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      style: styles.join('; '),
      loading: 'lazy',
      decoding: 'async',
    });

    return ['img', merged];
  },

  addNodeView() {
    if (typeof document === 'undefined') {
      return null;
    }

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement('img');
      el.draggable = false;

      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value != null && key !== 'width' && key !== 'height') {
          el.setAttribute(key, String(value));
        }
      });

      if (node.attrs.src) {
        el.src = node.attrs.src;
      }
      if (node.attrs.alt) {
        el.alt = node.attrs.alt;
      }

      // Initial dimensions if set
      if (node.attrs.width) {
        el.style.width = typeof node.attrs.width === 'number' ? `${node.attrs.width}px` : node.attrs.width;
      }
      if (node.attrs.height) {
        el.style.height = typeof node.attrs.height === 'number' ? `${node.attrs.height}px` : node.attrs.height;
      }

      // Live dimension tooltip badge
      const badge = document.createElement('div');
      badge.className = 'resize-dimension-badge';
      badge.style.display = 'none';

      // Click to select image node in TipTap
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const pos = getPos();
        if (typeof pos === 'number') {
          editor.chain().setNodeSelection(pos).focus().run();
        }
      });

      const onUpdate = (updatedNode: any) => {
        if (updatedNode.type !== node.type) {
          return false;
        }

        // Programmatic width / height updates (e.g. from preset buttons)
        const width = updatedNode.attrs.width;
        const height = updatedNode.attrs.height;
        if (width) {
          el.style.width = typeof width === 'number' ? `${width}px` : width;
        } else {
          el.style.width = '';
        }

        if (height) {
          el.style.height = typeof height === 'number' ? `${height}px` : height;
        } else {
          el.style.height = 'auto';
        }

        if (updatedNode.attrs.src && el.src !== updatedNode.attrs.src) {
          el.src = updatedNode.attrs.src;
        }
        if (updatedNode.attrs.alt && el.alt !== updatedNode.attrs.alt) {
          el.alt = updatedNode.attrs.alt;
        }

        const align = updatedNode.attrs.alignment || 'center';
        container.setAttribute('data-align', align);

        return true;
      };

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          const w = Math.round(width);
          const h = Math.round(height);
          el.style.width = `${w}px`;
          el.style.height = `${h}px`;
          badge.textContent = `${w} × ${h} px`;
          badge.style.display = 'block';
        },
        onCommit: (width, height) => {
          badge.style.display = 'none';
          const pos = getPos();
          if (pos === undefined) return;

          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes('image', {
              width: Math.round(width),
              height: Math.round(height),
            })
            .run();
        },
        onUpdate,
        options: {
          directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
          min: {
            width: 80,
            height: 80,
          },
          preserveAspectRatio: true,
        },
      });

      const container = nodeView.dom as HTMLElement;
      const wrapper = nodeView.wrapper as HTMLElement;

      const align = node.attrs.alignment || 'center';
      container.setAttribute('data-align', align);

      wrapper.appendChild(badge);

      const showNodeView = () => {
        container.style.visibility = '';
        container.style.pointerEvents = '';
      };

      container.style.visibility = 'hidden';
      container.style.pointerEvents = 'none';

      if (el.complete && el.naturalWidth > 0) {
        showNodeView();
      } else {
        el.onload = showNodeView;
        el.onerror = showNodeView;
      }

      return nodeView;
    };
  },
});

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  danger?: boolean;
  title?: string;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  danger = false,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        'p-2 rounded-md transition-all duration-200 flex items-center justify-center cursor-pointer',
        isActive
          ? 'bg-white text-accent-primary shadow-xs border border-border-color/50 font-semibold'
          : 'text-text-secondary hover:bg-black/[0.05] hover:text-text-primary border border-transparent',
        disabled && 'opacity-50 cursor-not-allowed',
        danger && !isActive && 'hover:text-danger hover:bg-danger/10'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 bg-bg-secondary/50 p-1 rounded-lg border border-border-color/50">
      {children}
    </div>
  );
}

export interface UploadedImage {
  url: string;
  width?: number;
  height?: number;
}

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (data: {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  }) => void;
  uploadImage?: (file: File) => Promise<UploadedImage>;
}

function ImageModal({ isOpen, onClose, onInsert, uploadImage }: ImageModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [urlError, setUrlError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      setUploadError('Use a JPG, PNG or WebP image.');
      return;
    }
    setUploadError('');
    setFile(file);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFilePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInsert = async () => {
    if (activeTab === 'upload' && filePreview) {
      if (uploadImage && file) {
        setUploading(true);
        setUploadError('');
        try {
          const uploaded = await uploadImage(file);
          onInsert({
            src: uploaded.url,
            alt: alt.trim() || fileName,
            width: uploaded.width,
            height: uploaded.height,
          });
          handleClose();
        } catch (err: any) {
          setUploadError(err?.message || 'Could not upload the image.');
        } finally {
          setUploading(false);
        }
        return;
      }
      onInsert({ src: filePreview, alt: alt.trim() || fileName });
      handleClose();
    } else if (activeTab === 'url' && url.trim()) {
      onInsert({ src: url.trim(), alt: alt.trim() || 'Article image' });
      handleClose();
    }
  };

  const handleClose = () => {
    setUrl('');
    setAlt('');
    setFilePreview(null);
    setFile(null);
    setFileName('');
    setUrlError(false);
    setUploading(false);
    setUploadError('');
    onClose();
  };

  const canSubmit = activeTab === 'upload' ? Boolean(filePreview) : Boolean(url.trim());

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl border border-black/10 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-color flex items-center justify-between bg-bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 text-accent-primary flex items-center justify-center">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">Insert Image</h3>
              <p className="text-xs text-text-secondary">Embed an image into the product description</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-6 pb-2">
          <div className="flex bg-black/[0.04] p-1 rounded-2xl border border-black/5">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={clsx(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
                activeTab === 'upload'
                  ? 'bg-white text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Upload size={14} />
              <span>Upload from Device</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={clsx(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
                activeTab === 'url'
                  ? 'bg-white text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <LinkIcon size={14} />
              <span>Image URL</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit && !urlError && !uploading) {
              e.preventDefault();
              e.stopPropagation();
              void handleInsert();
            }
          }}
          className="p-6 pt-4 space-y-4"
        >
          {activeTab === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!filePreview ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    'border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200',
                    dragOver
                      ? 'border-accent-primary bg-accent-primary/5 scale-[0.99]'
                      : 'border-black/10 hover:border-accent-primary/50 hover:bg-black/[0.01]'
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 text-accent-primary flex items-center justify-center mb-3">
                    <Upload size={22} />
                  </div>
                  <p className="text-sm font-semibold text-text-primary mb-1">
                    Click to browse or drag & drop image
                  </p>
                  <p className="text-xs text-text-muted">
                    JPG, PNG or WebP up to 12MB. Images are optimised to WebP automatically.
                  </p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-black/[0.02] p-3">
                  <div className="relative h-44 w-full flex items-center justify-center overflow-hidden rounded-xl bg-white/70">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={filePreview}
                      alt={fileName || 'Preview'}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs px-1">
                    <span className="font-medium text-text-primary truncate max-w-[260px]">
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilePreview(null);
                        setFile(null);
                        setFileName('');
                        setUploadError('');
                      }}
                      className="text-danger hover:underline font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
                  Image URL <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setUrlError(false);
                    }}
                    placeholder="https://images.unsplash.com/... or /images/..."
                    className="w-full bg-black/[0.02] border border-black/10 text-text-primary px-4 py-3 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/10 transition-all"
                  />
                </div>
              </div>

              {url.trim() && (
                <div className="rounded-2xl overflow-hidden border border-black/10 bg-black/[0.02] p-3">
                  <div className="relative h-36 w-full flex items-center justify-center overflow-hidden rounded-xl bg-white/70">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="URL Preview"
                      onError={() => setUrlError(true)}
                      className={clsx(
                        'max-h-full max-w-full object-contain',
                        urlError && 'hidden'
                      )}
                    />
                    {urlError && (
                      <div className="flex flex-col items-center gap-1 text-danger text-xs">
                        <AlertCircle size={20} />
                        <span>Unable to load image from this URL</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadError ? (
            <p className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-medium text-danger">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {uploadError}
            </p>
          ) : null}

          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">
              Caption / Alt Text (Optional)
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="e.g. MacBook Pro Liquid Retina XDR screen detail"
              className="w-full bg-black/[0.02] border border-black/10 text-text-primary px-4 py-2.5 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/10 transition-all"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-color">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleInsert()}
              disabled={!canSubmit || urlError || uploading}
              className={clsx(
                'px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer transition-all',
                canSubmit && !urlError && !uploading
                  ? 'btn btn-primary'
                  : 'bg-black/10 text-text-muted cursor-not-allowed'
              )}
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              <span>{uploading ? 'Uploading…' : 'Insert Image'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Contextual image toolbar when an image is active in the editor
 */
function ActiveImageBar({
  editor,
  imageAttrs,
}: {
  editor: any;
  imageAttrs: { width: number | string | null; alignment: 'left' | 'center' | 'right' } | null;
}) {
  if (!editor || !imageAttrs) return null;

  const currentWidth = imageAttrs.width;
  const currentAlign = imageAttrs.alignment || 'center';

  const setWidth = (width: number | null) => {
    editor.chain().focus().updateAttributes('image', { width, height: null }).run();
  };

  const adjustWidth = (delta: number) => {
    const current = typeof currentWidth === 'number' ? currentWidth : 500;
    const newWidth = Math.max(100, Math.min(1400, current + delta));
    setWidth(newWidth);
  };

  const setAlign = (alignment: 'left' | 'center' | 'right') => {
    editor.chain().focus().updateAttributes('image', { alignment }).run();
  };

  const deleteImage = () => {
    editor.chain().focus().deleteSelection().run();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-accent-primary/5 border-t border-accent-primary/20 text-xs animate-fade-in transition-all">
      <div className="flex items-center gap-1.5 font-bold text-accent-primary pr-2 border-r border-accent-primary/20">
        <ImageIcon size={14} />
        <span>Selected Image:</span>
        <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-accent-primary/30 text-[11px] font-semibold text-accent-primary shadow-2xs">
          {currentWidth ? (typeof currentWidth === 'number' ? `${currentWidth}px` : currentWidth) : 'Auto'}
        </span>
      </div>

      {/* Preset Widths */}
      <div className="flex items-center gap-1">
        <span className="text-text-muted text-[11px] font-medium mr-0.5">Quick Width:</span>
        {[
          { label: '25%', value: 220 },
          { label: '50%', value: 440 },
          { label: '75%', value: 660 },
          { label: '100%', value: 900 },
        ].map((preset) => {
          const isActive = currentWidth === preset.value;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => setWidth(preset.value)}
              className={clsx(
                'px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all',
                isActive
                  ? 'bg-accent-primary text-white shadow-xs'
                  : 'bg-white hover:bg-black/5 text-text-secondary border border-border-color/60'
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setWidth(null)}
          title="Reset to original / auto size"
          className={clsx(
            'px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all',
            !currentWidth
              ? 'bg-accent-primary text-white shadow-xs'
              : 'bg-white hover:bg-black/5 text-text-secondary border border-border-color/60'
          )}
        >
          Auto
        </button>
      </div>

      {/* Steppers */}
      <div className="flex items-center gap-1 border-l border-accent-primary/20 pl-2">
        <button
          type="button"
          onClick={() => adjustWidth(-50)}
          title="Shrink by 50px"
          className="px-2 py-1 rounded-md bg-white hover:bg-black/5 text-text-secondary border border-border-color/60 font-semibold cursor-pointer transition-all"
        >
          -50px
        </button>
        <button
          type="button"
          onClick={() => adjustWidth(50)}
          title="Enlarge by 50px"
          className="px-2 py-1 rounded-md bg-white hover:bg-black/5 text-text-secondary border border-border-color/60 font-semibold cursor-pointer transition-all"
        >
          +50px
        </button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 border-l border-accent-primary/20 pl-2">
        <span className="text-text-muted text-[11px] font-medium mr-0.5">Align:</span>
        <button
          type="button"
          onClick={() => setAlign('left')}
          title="Align Left"
          className={clsx(
            'p-1.5 rounded-md cursor-pointer transition-all',
            currentAlign === 'left'
              ? 'bg-accent-primary text-white shadow-2xs'
              : 'bg-white hover:bg-black/5 text-text-secondary border border-border-color/60'
          )}
        >
          <AlignLeft size={13} />
        </button>
        <button
          type="button"
          onClick={() => setAlign('center')}
          title="Align Center"
          className={clsx(
            'p-1.5 rounded-md cursor-pointer transition-all',
            currentAlign === 'center'
              ? 'bg-accent-primary text-white shadow-2xs'
              : 'bg-white hover:bg-black/5 text-text-secondary border border-border-color/60'
          )}
        >
          <AlignCenter size={13} />
        </button>
        <button
          type="button"
          onClick={() => setAlign('right')}
          title="Align Right"
          className={clsx(
            'p-1.5 rounded-md cursor-pointer transition-all',
            currentAlign === 'right'
              ? 'bg-accent-primary text-white shadow-2xs'
              : 'bg-white hover:bg-black/5 text-text-secondary border border-border-color/60'
          )}
        >
          <AlignRight size={13} />
        </button>
      </div>

      <div className="flex-1" />

      {/* Drag Hint */}
      <span className="hidden xl:inline-block text-[11px] text-text-muted italic pr-2">
        Tip: Drag corner handles to resize freely
      </span>

      {/* Delete button */}
      <button
        type="button"
        onClick={deleteImage}
        title="Delete Image"
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-danger hover:bg-danger/10 border border-danger/20 cursor-pointer transition-all"
      >
        <Trash2 size={13} />
        <span>Delete</span>
      </button>
    </div>
  );
}

function MenuBar({
  editor,
  onOpenImageModal,
  onQuickUpload,
  selectedImageAttrs,
}: {
  editor: any;
  onOpenImageModal: () => void;
  onQuickUpload: () => void;
  selectedImageAttrs: { width: number | string | null; alignment: 'left' | 'center' | 'right' } | null;
}) {
  const [, setVersion] = useState(0);
  const blockSelectionRef = useRef<number | null>(null);

  // TipTap does not re-render the toolbar on its own; force it so active
  // states and the block-type select stay in sync with the cursor.
  useEffect(() => {
    if (!editor) return;
    const rerender = () => setVersion((version) => version + 1);
    editor.on('transaction', rerender);
    editor.on('selectionUpdate', rerender);
    return () => {
      editor.off('transaction', rerender);
      editor.off('selectionUpdate', rerender);
    };
  }, [editor]);

  if (!editor) return null;

  const activeBlock = (() => {
    if (editor.isActive('codeBlock')) return 'codeBlock';
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      if (editor.isActive('heading', { level })) return `h${level}`;
    }
    return 'paragraph';
  })();

  const setBlock = (value: string, fromPosition?: number) => {
    const { state, view } = editor;
    const rawPosition =
      typeof fromPosition === 'number' ? fromPosition : state.selection.from;
    const position = Math.min(Math.max(rawPosition, 0), state.doc.content.size);
    const $from = state.doc.resolve(position);

    // Only change the text block that contains the cursor. Using
    // setHeading/toggleHeading operates on the whole selection, which can
    // accidentally include the previous line when the toolbar steals focus.
    let depth = $from.depth;
    while (depth > 0 && !$from.node(depth).isTextblock) {
      depth -= 1;
    }

    if (depth > 0) {
      const nodeType =
        value === 'paragraph'
          ? state.schema.nodes.paragraph
          : value === 'codeBlock'
            ? state.schema.nodes.codeBlock
            : state.schema.nodes.heading;

      if (nodeType) {
        const attrs = value.startsWith('h')
          ? { level: Number(value.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }
          : {};
        const transaction = state.tr.setBlockType(
          $from.before(depth),
          $from.after(depth),
          nodeType,
          attrs
        );
        view.dispatch(transaction);
        view.focus();
        return;
      }
    }

    // Fallback for unusual selections outside a text block.
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
      return;
    }
    if (value === 'codeBlock') {
      editor.chain().focus().setCodeBlock().run();
      return;
    }
    const level = Number(value.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6;
    editor.chain().focus().setHeading({ level }).run();
  };

  const applyLink = () => {
    const previous = (editor.getAttributes('link').href as string) || '';
    const url = window.prompt('Link URL (leave empty to remove)', previous || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className="border-b border-border-color bg-white/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <ToolbarGroup>
          <select
            value={activeBlock}
            onMouseDown={() => {
              blockSelectionRef.current = editor.state.selection.from;
            }}
            onChange={(event) => {
              setBlock(event.target.value, blockSelectionRef.current ?? undefined);
              blockSelectionRef.current = null;
            }}
            title="Paragraph style"
            aria-label="Paragraph style"
            className="h-8 rounded-md border border-border-color/60 bg-white px-2 text-xs font-semibold text-text-primary focus:border-accent-primary focus:outline-none cursor-pointer"
          >
            <option value="paragraph">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="h5">Heading 5</option>
            <option value="h6">Heading 6</option>
            <option value="codeBlock">Code block</option>
          </select>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => setBlock(activeBlock === 'h1' ? 'paragraph' : 'h1')}
            isActive={activeBlock === 'h1'}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setBlock(activeBlock === 'h2' ? 'paragraph' : 'h2')}
            isActive={activeBlock === 'h2'}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline"
          >
            <Underline size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Inline code"
          >
            <Code size={18} />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote size={18} />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={applyLink}
            isActive={editor.isActive('link')}
            title="Add / edit link"
          >
            <LinkIcon size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
            disabled={!editor.isActive('link')}
            title="Remove link"
          >
            <Unlink size={18} />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <Minus size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear formatting"
          >
            <RemoveFormatting size={18} />
          </ToolbarButton>
        </ToolbarGroup>

        {/* Media / Image Tools */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={onOpenImageModal}
            isActive={editor.isActive('image')}
            title="Insert Image (Upload or URL)"
          >
            <ImageIcon size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={onQuickUpload}
            title="Quick Upload Image File"
          >
            <Upload size={18} />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="Insert Table"
          >
            <TableIcon size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            disabled={!editor.can().addColumnAfter()}
            title="Add Column"
          >
            <span className="text-[11px] font-bold px-1">Col+</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            disabled={!editor.can().addRowAfter()}
            title="Add Row"
          >
            <span className="text-[11px] font-bold px-1">Row+</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={!editor.can().deleteColumn()}
            title="Delete Column"
          >
            <span className="text-[11px] font-bold px-1">Col−</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={!editor.can().deleteRow()}
            title="Delete Row"
          >
            <span className="text-[11px] font-bold px-1">Row−</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!editor.can().deleteTable()}
            danger
            title="Delete Table"
          >
            <Trash2 size={18} />
          </ToolbarButton>
        </ToolbarGroup>

        <div className="flex-1" />

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo size={18} />
          </ToolbarButton>
        </ToolbarGroup>
      </div>

      {/* Secondary toolbar active when an image is selected */}
      <ActiveImageBar editor={editor} imageAttrs={selectedImageAttrs} />
    </div>
  );
}

export interface RichTextEditorProps {
  content?: string;
  /** Controlled value (alias of `content`). */
  value?: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
  /**
   * Upload an inline image and return its public URL. When provided, editor
   * images are stored as files instead of large base64 data URLs.
   */
  onImageUpload?: (file: File) => Promise<UploadedImage>;
}

export function RichTextEditor({ content, value, onChange, className, placeholder, onImageUpload }: RichTextEditorProps) {
  const initialContent = value ?? content ?? '';
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [selectedImageAttrs, setSelectedImageAttrs] = useState<{
    width: number | string | null;
    alignment: 'left' | 'center' | 'right';
  } | null>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  const uploadAndInsertImage = async (
    file: File,
    view: any,
    position: number,
    replaceTo?: number
  ) => {
    const insertImage = (src: string, width?: number, height?: number) => {
      if (!view.dom.isConnected) return;
      const attrs: Record<string, unknown> = { src, alt: file.name };
      if (width) attrs.width = width;
      if (height) attrs.height = height;
      const node = view.state.schema.nodes.image.create(attrs);
      const transaction =
        typeof replaceTo === 'number'
          ? view.state.tr.replaceWith(position, replaceTo, node)
          : view.state.tr.insert(position, node);
      view.dispatch(transaction);
      view.focus();
    };

    if (!onImageUpload) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (src) insertImage(src);
      };
      reader.readAsDataURL(file);
      return;
    }

    setImageUploading(true);
    setImageUploadError('');
    try {
      const uploaded = await onImageUpload(file);
      insertImage(uploaded.url, uploaded.width, uploaded.height);
    } catch (err: any) {
      setImageUploadError(err?.message || 'Could not upload the image.');
    } finally {
      setImageUploading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-2xl max-w-full border border-black/5 mx-auto block cursor-pointer transition-all',
        },
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
        class:
          'rte-content focus:outline-none min-h-[300px] p-6 max-w-none [&_img]:rounded-2xl [&_img]:max-w-full [&_img]:shadow-sm [&_img]:border [&_img]:border-black/5 [&_img]:block [&_[data-resize-wrapper]_img]:m-0',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (coordinates) {
              void uploadAndInsertImage(file, view, coordinates.pos);
            }
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') === 0) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                const { from, to } = view.state.selection;
                void uploadAndInsertImage(file, view, from, to);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
  });

  // Track image selection state to show contextual image toolbar
  useEffect(() => {
    if (!editor) return;

    const updateImageAttrs = () => {
      if (editor.isActive('image')) {
        const attrs = editor.getAttributes('image');
        setSelectedImageAttrs({
          width: attrs.width || null,
          alignment: attrs.alignment || 'center',
        });
      } else {
        setSelectedImageAttrs(null);
      }
    };

    editor.on('selectionUpdate', updateImageAttrs);
    editor.on('transaction', updateImageAttrs);

    return () => {
      editor.off('selectionUpdate', updateImageAttrs);
      editor.off('transaction', updateImageAttrs);
    };
  }, [editor]);

  // Keep content in sync if parent changes content externally
  const externalContent = value ?? content ?? '';
  useEffect(() => {
    if (editor && !editor.isFocused && externalContent && externalContent !== editor.getHTML()) {
      editor.commands.setContent(externalContent);
    }
  }, [externalContent, editor]);

  const handleInsertImage = ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  }) => {
    if (editor) {
      const attrs: { src: string; alt: string; width?: number; height?: number } = {
        src,
        alt: alt || 'Description image',
      };
      if (width) attrs.width = width;
      if (height) attrs.height = height;
      editor.chain().focus().setImage(attrs).run();
    }
  };

  const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/') || !editor) return;

    if (!onImageUpload) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (src) editor.chain().focus().setImage({ src, alt: file.name }).run();
      };
      reader.readAsDataURL(file);
      return;
    }

    setImageUploading(true);
    setImageUploadError('');
    try {
      const uploaded = await onImageUpload(file);
      const attrs: { src: string; alt: string; width?: number; height?: number } = {
        src: uploaded.url,
        alt: file.name,
      };
      if (uploaded.width) attrs.width = uploaded.width;
      if (uploaded.height) attrs.height = uploaded.height;
      editor.chain().focus().setImage(attrs).run();
    } catch (err: any) {
      setImageUploadError(err?.message || 'Could not upload the image.');
    } finally {
      setImageUploading(false);
    }
  };

  return (
    <div
      className={clsx(
        'border border-border-color rounded-xl overflow-hidden bg-white shadow-2xs',
        className
      )}
    >
      {/* Scoped styles for Resizable image & handles */}
      <style>{`
        [data-resize-container] {
          position: relative;
          margin: 1.5rem 0;
          display: flex;
          justify-content: center;
          max-width: 100%;
        }
        [data-resize-container][data-align="left"] {
          justify-content: flex-start;
        }
        [data-resize-container][data-align="right"] {
          justify-content: flex-end;
        }
        [data-resize-container][data-align="center"] {
          justify-content: center;
        }
        [data-resize-wrapper] {
          position: relative;
          display: inline-block;
          line-height: 0;
          max-width: 100%;
          width: fit-content;
          user-select: none;
        }
        [data-resize-wrapper] img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 0 !important;
          border-radius: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.08);
          transition: outline 0.15s ease, box-shadow 0.15s ease;
          cursor: pointer;
        }
        [data-resize-container].ProseMirror-selectednode [data-resize-wrapper] img,
        [data-resize-container][data-resize-state="true"] [data-resize-wrapper] img {
          outline: 2.5px solid #8a5a2b;
          outline-offset: 3px;
          box-shadow: 0 8px 24px -4px rgba(233, 68, 31, 0.25);
        }
        [data-resize-handle] {
          position: absolute;
          width: 14px;
          height: 14px;
          background-color: #ffffff;
          border: 3px solid #8a5a2b;
          border-radius: 9999px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          z-index: 30;
          opacity: 0;
          pointer-events: none;
          touch-action: none;
          box-sizing: border-box;
          transition: opacity 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
        }
        [data-resize-container]:hover [data-resize-handle],
        [data-resize-container].ProseMirror-selectednode [data-resize-handle],
        [data-resize-container][data-resize-state="true"] [data-resize-handle] {
          opacity: 1;
          pointer-events: auto;
        }
        [data-resize-handle="top-left"] {
          top: 0 !important;
          left: 0 !important;
          transform: translate(-50%, -50%);
          cursor: nwse-resize;
        }
        [data-resize-handle="top-left"]:hover {
          transform: translate(-50%, -50%) scale(1.3);
          background-color: #8a5a2b;
        }
        [data-resize-handle="top-right"] {
          top: 0 !important;
          right: 0 !important;
          transform: translate(50%, -50%);
          cursor: nesw-resize;
        }
        [data-resize-handle="top-right"]:hover {
          transform: translate(50%, -50%) scale(1.3);
          background-color: #8a5a2b;
        }
        [data-resize-handle="bottom-left"] {
          bottom: 0 !important;
          left: 0 !important;
          transform: translate(-50%, 50%);
          cursor: nesw-resize;
        }
        [data-resize-handle="bottom-left"]:hover {
          transform: translate(-50%, 50%) scale(1.3);
          background-color: #8a5a2b;
        }
        [data-resize-handle="bottom-right"] {
          bottom: 0 !important;
          right: 0 !important;
          transform: translate(50%, 50%);
          cursor: nwse-resize;
        }
        [data-resize-handle="bottom-right"]:hover {
          transform: translate(50%, 50%) scale(1.3);
          background-color: #8a5a2b;
        }
        .resize-dimension-badge {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          padding: 4px 8px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          pointer-events: none;
          z-index: 40;
          border: 1px solid rgba(255, 255, 255, 0.15);
          letter-spacing: 0.025em;
        }
      `}</style>

      {/* Hidden quick upload file input */}
      <input
        ref={quickFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleQuickFileChange}
        className="hidden"
      />

      <MenuBar
        editor={editor}
        onOpenImageModal={() => setIsImageModalOpen(true)}
        onQuickUpload={() => quickFileInputRef.current?.click()}
        selectedImageAttrs={selectedImageAttrs}
      />

      {imageUploading || imageUploadError ? (
        <div
          className={clsx(
            'flex items-center gap-2 border-b px-3 py-2 text-[11.5px] font-medium',
            imageUploadError
              ? 'border-danger/20 bg-danger/5 text-danger'
              : 'border-border-color bg-bg-secondary/40 text-text-secondary'
          )}
        >
          {imageUploading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Optimising and uploading image…
            </>
          ) : (
            <>
              <AlertCircle size={13} />
              {imageUploadError}
              <button
                type="button"
                onClick={() => setImageUploadError('')}
                className="ml-auto text-[11px] font-semibold hover:underline"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      ) : null}

      <EditorContent editor={editor} />

      {/* Insert Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsert={handleInsertImage}
        uploadImage={onImageUpload}
      />
    </div>
  );
}
