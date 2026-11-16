'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Bold, Italic, List, ListOrdered } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: any) => void;
  initialData?: any;
  product?: any;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b border-border-color bg-black/5 rounded-t-xl">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded-md ${editor.isActive('bold') ? 'bg-black/10 text-accent-primary' : 'hover:bg-black/5'}`}
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded-md ${editor.isActive('italic') ? 'bg-black/10 text-accent-primary' : 'hover:bg-black/5'}`}
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded-md ${editor.isActive('bulletList') ? 'bg-black/10 text-accent-primary' : 'hover:bg-black/5'}`}
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded-md ${editor.isActive('orderedList') ? 'bg-black/10 text-accent-primary' : 'hover:bg-black/5'}`}
      >
        <ListOrdered size={16} />
      </button>
      
      <div className="w-px h-6 bg-border-color mx-1 self-center" />
      
      <button
        type="button"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        className="p-1.5 rounded-md hover:bg-black/5 text-xs font-medium"
      >
        Insert Table
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="p-1.5 rounded-md hover:bg-black/5 text-xs"
        disabled={!editor.can().addColumnAfter()}
      >
        Add Col
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="p-1.5 rounded-md hover:bg-black/5 text-xs"
        disabled={!editor.can().addRowAfter()}
      >
        Add Row
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="p-1.5 rounded-md hover:bg-black/5 text-xs text-danger"
        disabled={!editor.can().deleteTable()}
      >
        Del Table
      </button>
    </div>
  );
};

export function ProductModal({ isOpen, onClose, onSave, initialData, product }: ProductModalProps) {
  const activeProduct = initialData ?? product;
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    price: '',
    stock: '',
    status: 'Active',
    description: '',
    specifications: [{ key: '', value: '' }]
  });

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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setFormData(prev => ({ ...prev, description: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-[150px] p-4 max-w-none [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border-color [&_td]:p-2 [&_th]:border [&_th]:border-border-color [&_th]:p-2 [&_th]:bg-black/5 [&_th]:font-semibold',
      },
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (activeProduct) {
        setFormData({
          ...activeProduct,
          specifications: activeProduct.specifications?.length ? activeProduct.specifications : [{ key: '', value: '' }]
        });
        editor?.commands.setContent(activeProduct.description || '');
      } else {
        setFormData({
          id: Date.now().toString(),
          name: '',
          category: '',
          price: '',
          stock: '',
          status: 'Active',
          description: '',
          specifications: [{ key: '', value: '' }]
        });
        editor?.commands.setContent('');
      }
    }
  }, [isOpen, activeProduct, editor]);

  if (!mounted || !isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
    const newSpecs = [...formData.specifications];
    newSpecs[index][field] = val;
    setFormData(prev => ({ ...prev, specifications: newSpecs }));
  };

  const addSpec = () => {
    setFormData(prev => ({ ...prev, specifications: [...prev.specifications, { key: '', value: '' }] }));
  };

  const removeSpec = (index: number) => {
    setFormData(prev => ({ ...prev, specifications: prev.specifications.filter((_, i) => i !== index) }));
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-bg-primary border border-border-color rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative z-10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-border-color">
          <h2 className="text-xl font-bold">{initialData ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 text-text-secondary hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Product Name</label>
                <input 
                  type="text" required
                  value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-bg-secondary border border-border-color text-text-primary px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-primary" 
                  placeholder="e.g. iPhone 15 Pro" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Category</label>
                <input 
                  type="text" required
                  value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="bg-bg-secondary border border-border-color text-text-primary px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-primary" 
                  placeholder="e.g. Smartphones" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Price (৳)</label>
                <input 
                  type="text" required
                  value={formData.price} onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="bg-bg-secondary border border-border-color text-text-primary px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-primary" 
                  placeholder="999.00" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Stock</label>
                <input 
                  type="number" required
                  value={formData.stock} onChange={e => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  className="bg-bg-secondary border border-border-color text-text-primary px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-primary" 
                  placeholder="100" 
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-text-secondary">Status</label>
                <select 
                  value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="bg-bg-secondary border border-border-color text-text-primary px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-accent-primary"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary flex justify-between">
                <span>Description</span>
                <span className="text-xs text-text-muted font-normal">Use the table tool for rich data</span>
              </label>
              <div className="border border-border-color rounded-xl overflow-hidden bg-bg-primary focus-within:border-accent-primary transition-colors">
                <MenuBar editor={editor} />
                <EditorContent editor={editor} />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-text-secondary">Specifications (Key-Value)</label>
                <button type="button" onClick={addSpec} className="text-xs text-accent-primary hover:underline flex items-center gap-1">
                  <Plus size={14} /> Add Spec
                </button>
              </div>
              
              <div className="flex flex-col gap-2">
                {formData.specifications.map((spec, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={spec.key} onChange={e => updateSpec(idx, 'key', e.target.value)}
                      className="bg-bg-secondary border border-border-color px-3 py-2 rounded-lg text-sm flex-1 focus:outline-none focus:border-accent-primary" 
                      placeholder="e.g. Weight" 
                    />
                    <input 
                      type="text" 
                      value={spec.value} onChange={e => updateSpec(idx, 'value', e.target.value)}
                      className="bg-bg-secondary border border-border-color px-3 py-2 rounded-lg text-sm flex-1 focus:outline-none focus:border-accent-primary" 
                      placeholder="e.g. 2kg" 
                    />
                    <button type="button" onClick={() => removeSpec(idx)} className="p-2 text-danger hover:bg-danger-glow rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </form>
        </div>
        
        <div className="p-6 border-t border-border-color flex justify-end gap-3 bg-bg-secondary">
          <button type="button" onClick={onClose} className="btn bg-white border border-border-color hover:bg-black/5 text-text-primary">
            Cancel
          </button>
          <button type="submit" form="product-form" className="btn btn-primary">
            {initialData ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
