import React, { useState, useEffect } from "react";
import { Product } from "@/entities/Product";
import { ProductAdditional } from "@/entities/ProductAdditional";
import { Category } from "@/entities/Category";
import { ComplementGroup } from "@/entities/ComplementGroup";
import { ProductComplementGroup } from "@/entities/ProductComplementGroup";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Search, Layers, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

// New AdditionalsManager component
function AdditionalsManager({ productId, initialAdditionals = [] }) {
  const [additionals, setAdditionals] = useState(initialAdditionals);
  const [newAdditional, setNewAdditional] = useState({ name: '', price: '' });

  const handleAdd = async () => {
    if (!newAdditional.name || !newAdditional.price) return;
    try {
      const created = await ProductAdditional.create({
        ...newAdditional,
        price: parseFloat(newAdditional.price),
        product_id: productId,
      });
      setAdditionals([...additionals, created]);
      setNewAdditional({ name: '', price: '' });
    } catch (error) {
      alert("Erro ao adicionar adicional.");
      console.error("Error adding additional:", error);
    }
  };

  const handleDelete = async (additionalId) => {
    try {
      await ProductAdditional.delete(additionalId);
      setAdditionals(additionals.filter(a => a.id !== additionalId));
    } catch (error) {
      alert("Erro ao excluir adicional.");
      console.error("Error deleting additional:", error);
    }
  };

  useEffect(() => {
    setAdditionals(initialAdditionals);
  }, [initialAdditionals]);

  return (
    <div className="space-y-4 pt-4 mt-4 border-t">
      <h4 className="font-semibold">Adicionais</h4>
      <div className="space-y-2">
        {additionals.length === 0 && <p className="text-sm text-gray-500">Nenhum adicional adicionado.</p>}
        {additionals.map(ad => (
          <div key={ad.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
            <span>{ad.name} - R$ {ad.price.toFixed(2).replace('.', ',')}</span>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label htmlFor="additional-name">Nome do Adicional</Label>
          <Input 
            id="additional-name"
            value={newAdditional.name}
            onChange={e => setNewAdditional({...newAdditional, name: e.target.value})}
            placeholder="Ex: Bacon"
          />
        </div>
        <div className="w-28">
          <Label htmlFor="additional-price">Preço (R$)</Label>
          <Input 
            id="additional-price"
            type="number"
            step="0.01"
            value={newAdditional.price}
            onChange={e => setNewAdditional({...newAdditional, price: e.target.value})}
            placeholder="2.50"
          />
        </div>
        <Button type="button" onClick={handleAdd}>Adicionar</Button>
      </div>
    </div>
  );
}


export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [allAdditionals, setAllAdditionals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [complementGroups, setComplementGroups] = useState([]);
  const [productComplementGroups, setProductComplementGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image_url: "",
    available: true
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const [productsData, additionalsData, categoriesData, groupsData, pcgData] = await Promise.all([
        Product.list("-created_date"),
        ProductAdditional.list(),
        Category.list("order_index"),
        ComplementGroup.list("order_index"),
        ProductComplementGroup.list("-created_date")
      ]);
      setProducts(productsData || []);
      setAllAdditionals(additionalsData || []);
      setCategories(categoriesData || []);
      setComplementGroups(groupsData || []);
      setProductComplementGroups(pcgData || []);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const productData = {
        ...productForm,
        price: parseFloat(productForm.price)
      };

      let savedProduct;
      if (editingProduct) {
        savedProduct = await Product.update(editingProduct.id, productData);
      } else {
        savedProduct = await Product.create(productData);
      }

      const prodId = savedProduct?.id || editingProduct?.id;
      if (prodId) {
        // Sincronizar vínculos de complementos
        const currentLinks = productComplementGroups.filter(pcg => pcg.product_id === prodId);
        const currentGroupIds = currentLinks.map(pcg => pcg.group_id);

        // Remover desmarcados
        for (const link of currentLinks) {
          if (!selectedGroupIds.includes(link.group_id)) {
            await ProductComplementGroup.delete(link.id);
          }
        }

        // Adicionar novos
        for (const gid of selectedGroupIds) {
          if (!currentGroupIds.includes(gid)) {
            await ProductComplementGroup.create({
              product_id: prodId,
              group_id: gid,
              order_index: 0
            });
          }
        }
      }

      setShowModal(false);
      resetForm();
      await loadProducts();
    } catch (error) {
      alert("Erro ao salvar produto");
      console.error("Error saving product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      try {
        await Product.delete(productId);
        await loadProducts();
      } catch (error) {
        alert("Erro ao excluir produto.");
        console.error("Error deleting product:", error);
      }
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { file_url } = await UploadFile({ file });
        setProductForm(prev => ({ ...prev, image_url: file_url }));
      } catch (error) {
        alert("Erro ao fazer upload da imagem");
        console.error("Error uploading image:", error);
      }
    }
  };

  const resetForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      category: "",
      image_url: "",
      available: true
    });
    setSelectedGroupIds([]);
    setEditingProduct(null);
  };

  const openEditModal = (product) => {
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      category: product.category || "",
      image_url: product.image_url || "",
      available: product.available
    });
    const linked = productComplementGroups.filter(pcg => pcg.product_id === product.id).map(pcg => pcg.group_id);
    setSelectedGroupIds(linked);
    setEditingProduct(product);
    setShowModal(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });
  
  const getCategoryNameById = (categoryId) => {
    return categories.find(c => c.id === categoryId)?.name || 'Sem Categoria';
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
            <p className="text-gray-600 mt-2">Gerencie o cardápio do seu restaurante</p>
          </div>
          <Button 
            onClick={() => {
              resetForm(); // Reset form when opening for new product
              setShowModal(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-200 text-gray-400">
                        📦
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                       <div>
                        <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-gray-500">{getCategoryNameById(product.category)}</p>
                       </div>
                      <Badge 
                        variant={product.available ? "default" : "secondary"}
                        className={product.available ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}
                      >
                        {product.available ? "Disponível" : "Indisponível"}
                      </Badge>
                    </div>
                    
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold text-amber-600">
                        R$ {product.price.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditModal(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50/50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterCategory !== "all" 
                ? "Tente ajustar os filtros de busca." 
                : "Adicione seu primeiro produto ao cardápio."}
            </p>
          </div>
        )}

        <Dialog open={showModal} onOpenChange={(open) => {
          if (!open) { // If dialog is closing
            resetForm();
          }
          setShowModal(open);
        }}>
          <DialogContent className="sm:max-w-2xl"> {/* Changed max-w-md to max-w-2xl */}
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do produto *</Label>
                <Input
                  id="name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preço *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={productForm.category}
                    onValueChange={(value) => setProductForm({...productForm, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                         <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="image">Imagem do produto</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
                {productForm.image_url && (
                  <div className="mt-2">
                    <img
                      src={productForm.image_url}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={productForm.available}
                  onCheckedChange={(checked) => setProductForm({...productForm, available: checked})}
                />
                <Label htmlFor="available">Produto disponível</Label>
              </div>

              {/* Grupos de Complementos e Adicionais Globais (Padrão Anota AI) */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-red-600" /> Grupos de Adicionais & Complementos
                    </h4>
                    <p className="text-xs text-gray-500">Selecione quais grupos de opções este produto possui</p>
                  </div>
                  <Link 
                    to={createPageUrl("Complements")} 
                    className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    Gerenciar Grupos <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {complementGroups.length === 0 ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    Nenhum grupo global cadastrado. <Link to={createPageUrl("Complements")} className="underline font-bold">Criar grupos de complementos</Link>.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200">
                    {complementGroups.map(grp => {
                      const isSelected = selectedGroupIds.includes(grp.id);
                      return (
                        <label 
                          key={grp.id} 
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-red-50/70 border-red-300 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                        >
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGroupIds([...selectedGroupIds, grp.id]);
                              } else {
                                setSelectedGroupIds(selectedGroupIds.filter(id => id !== grp.id));
                              }
                            }}
                            className="mt-0.5 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                          />
                          <div className="min-w-0 flex-1 text-xs">
                            <span className="font-semibold text-gray-800 block truncate">{grp.name}</span>
                            <span className="text-gray-500 text-[11px]">
                              {grp.required || grp.min_quantity > 0 ? 'Obrigatório' : 'Opcional'} • Máx: {grp.max_quantity}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {editingProduct && allAdditionals.some(a => a.product_id === editingProduct.id) && (
                <AdditionalsManager 
                  productId={editingProduct.id}
                  initialAdditionals={allAdditionals.filter(a => a.product_id === editingProduct.id)}
                />
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {setShowModal(false); resetForm();}}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                >
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}