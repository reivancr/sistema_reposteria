// =====================================================================
//  SERVICIO DE GOOGLE CLOUD FIRESTORE — Dulce Menta Bakery System
//  Provee persistencia en la nube en tiempo real para GitHub Pages,
//  Firebase Hosting y despliegues móviles sin necesidad de backend Node.js.
// =====================================================================

const FirebaseService = {
  db: null,
  app: null,
  initialized: false,

  // Inicializar Firebase si existe configuración válida
  init() {
    if (this.initialized) return true;
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK no está disponible en la página.');
      return false;
    }

    if (!window.isFirebaseConfigured || !window.isFirebaseConfigured()) {
      return false;
    }

    try {
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(window.FIREBASE_CONFIG);
      } else {
        this.app = firebase.app();
      }

      this.db = firebase.firestore();

      // Habilitar persistencia offline si el navegador lo soporta
      try {
        this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      } catch (e) {}

      this.initialized = true;
      console.log('🔥 Conectado con éxito a Google Firebase Cloud Firestore');
      return true;
    } catch (err) {
      console.error('Error inicializando Firebase:', err);
      return false;
    }
  },

  isReady() {
    if (!this.initialized) {
      return this.init();
    }
    return Boolean(this.db);
  },

  // Helper para generar IDs secuenciales o numéricos
  async getNextId(collectionName) {
    const snap = await this.db.collection(collectionName).get();
    if (snap.empty) return 1;
    let max = 0;
    snap.forEach(doc => {
      const data = doc.data();
      const id = typeof data.id === 'number' ? data.id : parseInt(doc.id, 10);
      if (!isNaN(id) && id > max) max = id;
    });
    return max + 1;
  },

  // ─── Settings ───────────────────────────────────────────────────────
  async getSettings() {
    const doc = await this.db.collection('settings').doc('general').get();
    if (doc.exists) {
      return doc.data();
    }
    return {
      bakery_name: 'Dulce Menta — Panadería & Repostería Artesanal',
      currency_symbol: '₡',
      phone: '+506 8888-1234',
      whatsapp: '50688881234',
      address: 'Barrio Escalante, 100m Este del Parque, San José, Costa Rica',
      low_stock_alerts_enabled: 'true'
    };
  },

  async saveSettings(settings) {
    await this.db.collection('settings').doc('general').set(settings, { merge: true });
    return { message: 'Configuraciones guardadas con éxito' };
  },

  // ─── Inventario ─────────────────────────────────────────────────────
  async getInventory() {
    const snap = await this.db.collection('ingredients').get();
    const list = [];
    snap.forEach(doc => {
      const data = doc.data();
      const id = data.id || parseInt(doc.id, 10) || doc.id;
      const current_stock = Number(data.current_stock) || 0;
      const min_stock = Number(data.min_stock) || 0;
      const cost_per_unit = Number(data.cost_per_unit) || 0;

      let stock_status = 'OPTIMO';
      if (current_stock <= 0) stock_status = 'AGOTADO';
      else if (current_stock <= min_stock) stock_status = 'BAJO';

      list.push({
        ...data,
        id,
        current_stock,
        min_stock,
        cost_per_unit,
        stock_status,
        total_value: Math.round(current_stock * cost_per_unit * 100) / 100
      });
    });

    const statusOrder = { AGOTADO: 1, BAJO: 2, OPTIMO: 3 };
    list.sort((a, b) => {
      if (statusOrder[a.stock_status] !== statusOrder[b.stock_status]) {
        return statusOrder[a.stock_status] - statusOrder[b.stock_status];
      }
      return (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || '');
    });

    return list;
  },

  async getInventoryAlerts() {
    const all = await this.getInventory();
    return all
      .filter(i => i.current_stock <= i.min_stock)
      .map(i => ({
        ...i,
        deficit: Math.round((i.min_stock - i.current_stock) * 1000) / 1000,
        alert_level: i.current_stock <= 0 ? 'AGOTADO' : 'BAJO'
      }))
      .sort((a, b) => a.current_stock - b.current_stock);
  },

  async createIngredient(data) {
    const id = await this.getNextId('ingredients');
    const newDoc = {
      id,
      name: data.name.trim(),
      category: data.category.trim(),
      unit: data.unit.trim(),
      cost_per_unit: parseFloat(data.cost_per_unit) || 0,
      current_stock: parseFloat(data.current_stock) || 0,
      min_stock: parseFloat(data.min_stock) || 0,
      notes: data.notes ? data.notes.trim() : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.db.collection('ingredients').doc(String(id)).set(newDoc);

    if (newDoc.current_stock > 0) {
      await this.db.collection('inventory_movements').add({
        ingredient_id: id,
        type: 'ENTRADA',
        quantity: newDoc.current_stock,
        unit_cost: newDoc.cost_per_unit,
        reference: 'Stock Inicial',
        notes: 'Registro inicial del insumo',
        created_at: new Date().toISOString()
      });
    }

    return newDoc;
  },

  async updateIngredient(id, data) {
    const ref = this.db.collection('ingredients').doc(String(id));
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Insumo no encontrado');

    const updateData = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.category !== undefined) updateData.category = data.category.trim();
    if (data.unit !== undefined) updateData.unit = data.unit.trim();
    if (data.cost_per_unit !== undefined) updateData.cost_per_unit = parseFloat(data.cost_per_unit) || 0;
    if (data.min_stock !== undefined) updateData.min_stock = parseFloat(data.min_stock) || 0;
    if (data.notes !== undefined) updateData.notes = data.notes.trim();

    await ref.update(updateData);
    const updated = await ref.get();
    return { ...updated.data(), id: Number(id) };
  },

  async adjustStock(id, data) {
    const ref = this.db.collection('ingredients').doc(String(id));
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Insumo no encontrado');

    const current = doc.data();
    const qty = parseFloat(data.quantity);
    if (isNaN(qty) || qty <= 0) throw new Error('Cantidad debe ser mayor a cero');

    let newStock = Number(current.current_stock) || 0;
    const newCost = data.unit_cost !== undefined && data.unit_cost !== '' ? parseFloat(data.unit_cost) : current.cost_per_unit;

    if (data.type === 'ENTRADA') {
      newStock += qty;
    } else if (data.type === 'MERMA' || data.type === 'AJUSTE_RESTA') {
      newStock = Math.max(0, newStock - qty);
    } else if (data.type === 'AJUSTE_EXACTO') {
      newStock = qty;
    } else {
      throw new Error('Tipo de movimiento inválido');
    }

    await ref.update({
      current_stock: newStock,
      cost_per_unit: newCost,
      updated_at: new Date().toISOString()
    });

    await this.db.collection('inventory_movements').add({
      ingredient_id: Number(id),
      type: data.type,
      quantity: qty,
      unit_cost: newCost,
      reference: data.reference || (data.type === 'ENTRADA' ? 'Compra / Reabastecimiento' : 'Ajuste de inventario'),
      notes: data.notes || '',
      created_at: new Date().toISOString()
    });

    const updated = await ref.get();
    return { message: 'Stock actualizado con éxito', ingredient: { ...updated.data(), id: Number(id) } };
  },

  async deleteIngredient(id, force = false) {
    // Verificar recetas que usen este insumo
    const recipesSnap = await this.db.collection('recipes').where('ingredient_id', '==', Number(id)).get();
    if (!recipesSnap.empty && !force) {
      const err = new Error(`El insumo está siendo utilizado en ${recipesSnap.size} receta(s). ¿Deseas forzar la eliminación y retirarlo de todas las recetas?`);
      err.data = { in_recipes: true, recipes_count: recipesSnap.size };
      throw err;
    }

    const batch = this.db.batch();

    // Eliminar de recetas si es forzado
    if (force && !recipesSnap.empty) {
      recipesSnap.forEach(doc => batch.delete(doc.ref));
    }

    // Eliminar movimientos de inventario
    const movesSnap = await this.db.collection('inventory_movements').where('ingredient_id', '==', Number(id)).get();
    movesSnap.forEach(doc => batch.delete(doc.ref));

    // Eliminar ingrediente
    batch.delete(this.db.collection('ingredients').doc(String(id)));

    await batch.commit();
    return { message: 'Insumo eliminado con éxito' };
  },

  // ─── Productos y Recetas ────────────────────────────────────────────
  async getProducts() {
    const [prodsSnap, recipesSnap, ingsSnap] = await Promise.all([
      this.db.collection('products').get(),
      this.db.collection('recipes').get(),
      this.db.collection('ingredients').get()
    ]);

    const ingsMap = {};
    ingsSnap.forEach(doc => {
      ingsMap[Number(doc.id)] = doc.data();
    });

    const recipesByProduct = {};
    recipesSnap.forEach(doc => {
      const r = doc.data();
      const pId = Number(r.product_id);
      if (!recipesByProduct[pId]) recipesByProduct[pId] = [];
      const ing = ingsMap[Number(r.ingredient_id)];
      const cost_per_unit = ing ? Number(ing.cost_per_unit) || 0 : 0;
      recipesByProduct[pId].push({
        ...r,
        ingredient_name: ing ? ing.name : '—',
        cost_per_unit,
        total_cost: (Number(r.quantity) || 0) * cost_per_unit
      });
    });

    const products = [];
    prodsSnap.forEach(doc => {
      const p = doc.data();
      const id = Number(p.id) || Number(doc.id);
      if (p.is_active === 0) return;

      const pRecipes = recipesByProduct[id] || [];
      const total_recipe_cost = Math.round(pRecipes.reduce((sum, item) => sum + item.total_cost, 0) * 100) / 100;
      const yieldQty = Number(p.yield_quantity) > 0 ? Number(p.yield_quantity) : 1;
      const unit_cost = Math.round((total_recipe_cost / yieldQty) * 100) / 100;
      const sale_price = Number(p.sale_price) || 0;
      const gross_profit = Math.round((sale_price - total_recipe_cost) * 100) / 100;
      const profit_margin_pct = sale_price > 0 ? Math.round(((gross_profit / sale_price) * 100) * 10) / 10 : 0;

      products.push({
        ...p,
        id,
        sale_price,
        yield_quantity: yieldQty,
        total_recipe_cost,
        ingredients_count: pRecipes.length,
        unit_cost,
        gross_profit,
        profit_margin_pct
      });
    });

    products.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
    return products;
  },

  async getProduct(id) {
    const doc = await this.db.collection('products').doc(String(id)).get();
    if (!doc.exists) throw new Error('Producto no encontrado');

    const p = doc.data();
    const [recipesSnap, ingsSnap] = await Promise.all([
      this.db.collection('recipes').where('product_id', '==', Number(id)).get(),
      this.db.collection('ingredients').get()
    ]);

    const ingsMap = {};
    ingsSnap.forEach(d => { ingsMap[Number(d.id)] = d.data(); });

    let totalCost = 0;
    const recipeItems = [];
    recipesSnap.forEach(d => {
      const r = d.data();
      const ing = ingsMap[Number(r.ingredient_id)];
      const unitCost = ing ? Number(ing.cost_per_unit) || 0 : 0;
      const itemCost = Math.round((Number(r.quantity) * unitCost) * 100) / 100;
      totalCost += itemCost;

      recipeItems.push({
        recipe_item_id: d.id,
        ingredient_id: Number(r.ingredient_id),
        recipe_quantity: Number(r.quantity),
        recipe_notes: r.notes || '',
        ingredient_name: ing ? ing.name : '—',
        ingredient_category: ing ? ing.category : '',
        ingredient_unit: ing ? ing.unit : '',
        cost_per_unit: unitCost,
        current_stock: ing ? ing.current_stock : 0,
        ingredient_total_cost: itemCost
      });
    });

    const yieldQty = Number(p.yield_quantity) > 0 ? Number(p.yield_quantity) : 1;
    const grossProfit = Number(p.sale_price) - totalCost;
    const profitMarginPct = Number(p.sale_price) > 0 ? Math.round(((grossProfit / Number(p.sale_price)) * 100) * 10) / 10 : 0;

    return {
      ...p,
      id: Number(id),
      recipe: recipeItems,
      total_recipe_cost: Math.round(totalCost * 100) / 100,
      unit_cost: Math.round((totalCost / yieldQty) * 100) / 100,
      gross_profit: Math.round(grossProfit * 100) / 100,
      profit_margin_pct: profitMarginPct
    };
  },

  async createProduct(data) {
    const id = await this.getNextId('products');
    const newProduct = {
      id,
      name: data.name.trim(),
      category: data.category.trim(),
      description: data.description ? data.description.trim() : '',
      sale_price: parseFloat(data.sale_price) || 0,
      yield_quantity: parseFloat(data.yield_quantity) || 1,
      yield_unit: data.yield_unit ? data.yield_unit.trim() : 'unidad',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.db.collection('products').doc(String(id)).set(newProduct);

    if (Array.isArray(data.recipe) && data.recipe.length > 0) {
      const batch = this.db.batch();
      for (const item of data.recipe) {
        if (item.ingredient_id && parseFloat(item.quantity) > 0) {
          const recRef = this.db.collection('recipes').doc();
          batch.set(recRef, {
            product_id: id,
            ingredient_id: Number(item.ingredient_id),
            quantity: parseFloat(item.quantity),
            notes: item.notes || ''
          });
        }
      }
      await batch.commit();
    }

    return newProduct;
  },

  async updateProduct(id, data) {
    const ref = this.db.collection('products').doc(String(id));
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Producto no encontrado');

    const updateData = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.category !== undefined) updateData.category = data.category.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.sale_price !== undefined) updateData.sale_price = parseFloat(data.sale_price) || 0;
    if (data.yield_quantity !== undefined) updateData.yield_quantity = parseFloat(data.yield_quantity) || 1;
    if (data.yield_unit !== undefined) updateData.yield_unit = data.yield_unit.trim();
    if (data.is_active !== undefined) updateData.is_active = Number(data.is_active);

    await ref.update(updateData);
    const updated = await ref.get();
    return { ...updated.data(), id: Number(id) };
  },

  async saveRecipe(productId, items) {
    const pId = Number(productId);
    const currentRecipes = await this.db.collection('recipes').where('product_id', '==', pId).get();
    const batch = this.db.batch();

    currentRecipes.forEach(doc => batch.delete(doc.ref));

    if (Array.isArray(items)) {
      for (const it of items) {
        const qty = parseFloat(it.quantity);
        const ingId = Number(it.ingredient_id);
        if (ingId && qty > 0) {
          const newDoc = this.db.collection('recipes').doc();
          batch.set(newDoc, {
            product_id: pId,
            ingredient_id: ingId,
            quantity: qty,
            notes: it.notes || ''
          });
        }
      }
    }

    await batch.commit();
    const prodDetails = await this.getProduct(pId);
    return {
      message: 'Receta actualizada con éxito',
      recipe: prodDetails.recipe,
      total_recipe_cost: prodDetails.total_recipe_cost
    };
  },

  async deleteRecipe(productId) {
    const pId = Number(productId);
    const snap = await this.db.collection('recipes').where('product_id', '==', pId).get();
    const batch = this.db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return { message: 'Receta eliminada con éxito' };
  },

  async deleteProduct(id, force = false) {
    const pId = Number(id);
    const orderItemsSnap = await this.db.collection('order_items').where('product_id', '==', pId).get();

    if (!orderItemsSnap.empty && !force) {
      const err = new Error(`El producto tiene ${orderItemsSnap.size} pedidos asociados en el historial. ¿Deseas eliminarlo de forma definitiva junto con sus registros asociados?`);
      err.data = { has_orders: true, orders_count: orderItemsSnap.size };
      throw err;
    }

    const batch = this.db.batch();

    if (force && !orderItemsSnap.empty) {
      orderItemsSnap.forEach(doc => batch.delete(doc.ref));
    }

    const recSnap = await this.db.collection('recipes').where('product_id', '==', pId).get();
    recSnap.forEach(doc => batch.delete(doc.ref));

    const prodSnap = await this.db.collection('productions').where('product_id', '==', pId).get();
    prodSnap.forEach(doc => batch.delete(doc.ref));

    batch.delete(this.db.collection('products').doc(String(id)));
    await batch.commit();
    return { message: 'Producto y su receta eliminados con éxito' };
  },

  // ─── Proyección y Ejecución de Producción ───────────────────────────
  async projectProduction(productId, quantity) {
    const product = await this.getProduct(productId);
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) throw new Error('Cantidad debe ser mayor a cero');

    if (!product.recipe || product.recipe.length === 0) {
      throw new Error('Este producto no tiene una receta configurada todavía.');
    }

    const yieldQty = product.yield_quantity > 0 ? product.yield_quantity : 1;
    const scaleFactor = qty / yieldQty;

    let totalProductionCost = 0;
    let hasShortage = false;

    const calculated = product.recipe.map(item => {
      const required = Math.round((item.recipe_quantity * scaleFactor) * 1000) / 1000;
      const itemCost = Math.round((required * item.cost_per_unit) * 100) / 100;
      totalProductionCost += itemCost;

      const isEnough = item.current_stock >= required;
      if (!isEnough) hasShortage = true;

      return {
        ingredient_id: item.ingredient_id,
        name: item.ingredient_name,
        category: item.ingredient_category,
        unit: item.ingredient_unit,
        unit_cost: item.cost_per_unit,
        base_quantity: item.recipe_quantity,
        required_quantity: required,
        current_stock: item.current_stock,
        is_enough: isEnough,
        shortage: isEnough ? 0 : Math.round((required - item.current_stock) * 1000) / 1000,
        total_cost: itemCost
      };
    });

    const expectedRevenue = Math.round(((qty / yieldQty) * product.sale_price) * 100) / 100;
    const expectedProfit = Math.round((expectedRevenue - totalProductionCost) * 100) / 100;
    const profitMargin = expectedRevenue > 0 ? Math.round(((expectedProfit / expectedRevenue) * 100) * 10) / 10 : 0;

    return {
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        sale_price: product.sale_price,
        yield_quantity: product.yield_quantity,
        yield_unit: product.yield_unit
      },
      production_plan: {
        quantity_to_produce: qty,
        scale_factor: Math.round(scaleFactor * 1000) / 1000,
        batches: Math.round(scaleFactor * 10) / 10,
        ingredients: calculated,
        has_shortage: hasShortage,
        total_cost: Math.round(totalProductionCost * 100) / 100,
        expected_revenue: expectedRevenue,
        expected_profit: expectedProfit,
        profit_margin_pct: profitMargin
      }
    };
  },

  async executeProduction(productId, quantity, notes, allowNegative = false) {
    const proj = await this.projectProduction(productId, quantity);
    const plan = proj.production_plan;

    if (!allowNegative && plan.has_shortage) {
      const shortItem = plan.ingredients.find(i => !i.is_enough);
      throw new Error(`Stock insuficiente para '${shortItem.name}'. Requerido: ${shortItem.required_quantity} ${shortItem.unit}, Disponible: ${shortItem.current_stock} ${shortItem.unit}.`);
    }

    const batch = this.db.batch();

    for (const item of plan.ingredients) {
      const ingRef = this.db.collection('ingredients').doc(String(item.ingredient_id));
      const ingDoc = await ingRef.get();
      const currentStock = ingDoc.exists ? Number(ingDoc.data().current_stock) || 0 : 0;
      const newStock = Math.round((currentStock - item.required_quantity) * 1000) / 1000;

      batch.update(ingRef, {
        current_stock: newStock,
        updated_at: new Date().toISOString()
      });

      const moveRef = this.db.collection('inventory_movements').doc();
      batch.set(moveRef, {
        ingredient_id: item.ingredient_id,
        type: 'SALIDA_PRODUCCION',
        quantity: item.required_quantity,
        unit_cost: item.unit_cost,
        reference: `Producción: ${quantity} ${proj.product.name}`,
        notes: notes || 'Consumo automático de insumos por producción',
        created_at: new Date().toISOString()
      });
    }

    const prodId = await this.getNextId('productions');
    const prodRef = this.db.collection('productions').doc(String(prodId));
    batch.set(prodRef, {
      id: prodId,
      product_id: Number(productId),
      quantity: Number(quantity),
      total_cost: plan.total_cost,
      expected_revenue: plan.expected_revenue,
      notes: notes || `Elaboración de ${quantity} ${proj.product.name}`,
      production_date: new Date().toISOString()
    });

    await batch.commit();

    return {
      message: '¡Producción ejecutada con éxito! Insumos descontados del inventario.',
      production_id: prodId,
      product_name: proj.product.name,
      quantity_produced: quantity,
      total_cost_consumed: plan.total_cost
    };
  },

  // ─── Clientes ───────────────────────────────────────────────────────
  async getCustomers() {
    const [custSnap, ordersSnap] = await Promise.all([
      this.db.collection('customers').get(),
      this.db.collection('orders').get()
    ]);

    const ordersByCust = {};
    ordersSnap.forEach(doc => {
      const o = doc.data();
      const cId = Number(o.customer_id);
      if (!ordersByCust[cId]) ordersByCust[cId] = [];
      ordersByCust[cId].push(o);
    });

    const customers = [];
    custSnap.forEach(doc => {
      const c = doc.data();
      const id = Number(c.id) || Number(doc.id);
      const orders = ordersByCust[id] || [];
      const validOrders = orders.filter(o => o.status !== 'CANCELADO');

      const total_orders = orders.length;
      const total_purchases = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const total_paid = validOrders.reduce((sum, o) => sum + (Number(o.total_paid) || 0), 0);
      const pending_balance = Math.round((total_purchases - total_paid) * 100) / 100;

      customers.push({
        ...c,
        id,
        total_orders,
        total_purchases: Math.round(total_purchases * 100) / 100,
        total_paid: Math.round(total_paid * 100) / 100,
        pending_balance
      });
    });

    customers.sort((a, b) => b.pending_balance - a.pending_balance || (a.name || '').localeCompare(b.name || ''));
    return customers;
  },

  async getCustomer(id) {
    const cId = Number(id);
    const [custDoc, ordersSnap, paymentsSnap] = await Promise.all([
      this.db.collection('customers').doc(String(id)).get(),
      this.db.collection('orders').where('customer_id', '==', cId).get(),
      this.db.collection('payments').where('customer_id', '==', cId).get()
    ]);

    if (!custDoc.exists) throw new Error('Cliente no encontrado');

    const orders = [];
    ordersSnap.forEach(doc => {
      const o = doc.data();
      orders.push({
        ...o,
        id: Number(o.id) || Number(doc.id),
        balance: (Number(o.total_amount) || 0) - (Number(o.total_paid) || 0)
      });
    });
    orders.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    const payments = [];
    paymentsSnap.forEach(doc => {
      payments.push({ ...doc.data(), id: doc.id });
    });
    payments.sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));

    const valid = orders.filter(o => o.status !== 'CANCELADO');
    return {
      ...custDoc.data(),
      id: cId,
      orders,
      payments,
      stats: {
        total_orders: orders.length,
        total_purchases: valid.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
        total_paid: valid.reduce((sum, o) => sum + (Number(o.total_paid) || 0), 0),
        pending_balance: valid.reduce((sum, o) => sum + (Number(o.balance) || 0), 0)
      }
    };
  },

  async createCustomer(data) {
    const id = await this.getNextId('customers');
    const newCust = {
      id,
      name: data.name.trim(),
      phone: data.phone ? data.phone.trim() : '',
      email: data.email ? data.email.trim() : '',
      address: data.address ? data.address.trim() : '',
      notes: data.notes ? data.notes.trim() : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await this.db.collection('customers').doc(String(id)).set(newCust);
    return newCust;
  },

  async updateCustomer(id, data) {
    const ref = this.db.collection('customers').doc(String(id));
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Cliente no encontrado');

    const updateData = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.email !== undefined) updateData.email = data.email.trim();
    if (data.address !== undefined) updateData.address = data.address.trim();
    if (data.notes !== undefined) updateData.notes = data.notes.trim();

    await ref.update(updateData);
    const updated = await ref.get();
    return { ...updated.data(), id: Number(id) };
  },

  async deleteCustomer(id, force = false) {
    const cId = Number(id);
    const ordersSnap = await this.db.collection('orders').where('customer_id', '==', cId).get();

    if (!ordersSnap.empty && !force) {
      const err = new Error(`El cliente tiene ${ordersSnap.size} pedido(s) registrados. ¿Deseas forzar la eliminación de este cliente y todo su historial de pedidos y pagos?`);
      err.data = { has_orders: true, orders_count: ordersSnap.size };
      throw err;
    }

    if (force && !ordersSnap.empty) {
      // Reponer stock si fue descontado y eliminar items y pagos
      for (const oDoc of ordersSnap.docs) {
        const o = oDoc.data();
        if (o.inventory_deducted === 1) {
          await this._restoreOrderInventory(o.id || oDoc.id, o.order_number);
        }

        const itemsSnap = await this.db.collection('order_items').where('order_id', '==', Number(o.id || oDoc.id)).get();
        const batchItems = this.db.batch();
        itemsSnap.forEach(d => batchItems.delete(d.ref));
        await batchItems.commit();

        const paysSnap = await this.db.collection('payments').where('order_id', '==', Number(o.id || oDoc.id)).get();
        const batchPays = this.db.batch();
        paysSnap.forEach(d => batchPays.delete(d.ref));
        await batchPays.commit();

        await oDoc.ref.delete();
      }
    }

    await this.db.collection('customers').doc(String(id)).delete();
    return { message: 'Cliente eliminado con éxito' };
  },

  // ─── Pedidos ────────────────────────────────────────────────────────
  async getOrders(params = {}) {
    const [ordersSnap, custSnap, itemsSnap] = await Promise.all([
      this.db.collection('orders').get(),
      this.db.collection('customers').get(),
      this.db.collection('order_items').get()
    ]);

    const custMap = {};
    custSnap.forEach(d => { custMap[Number(d.id)] = d.data(); });

    const itemsCountMap = {};
    itemsSnap.forEach(d => {
      const oId = Number(d.data().order_id);
      itemsCountMap[oId] = (itemsCountMap[oId] || 0) + 1;
    });

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];

    const orders = [];
    ordersSnap.forEach(doc => {
      const o = doc.data();
      const id = Number(o.id) || Number(doc.id);
      const cust = custMap[Number(o.customer_id)];

      if (params.status && o.status !== params.status) return;
      if (params.payment_status && o.payment_status !== params.payment_status) return;

      if (params.date && o.delivery_date !== params.date) return;
      else if (params.period === 'today' && o.delivery_date !== today) return;
      else if (params.period === 'tomorrow' && o.delivery_date !== tomorrow) return;
      else if (params.period === 'week' && (o.delivery_date < today || o.delivery_date > nextWeek)) return;

      const total_amount = Number(o.total_amount) || 0;
      const total_paid = Number(o.total_paid) || 0;

      orders.push({
        ...o,
        id,
        customer_name: cust ? cust.name : '—',
        customer_phone: cust ? cust.phone : '',
        pending_balance: Math.round((total_amount - total_paid) * 100) / 100,
        items_count: itemsCountMap[id] || 0
      });
    });

    orders.sort((a, b) => {
      if (a.delivery_date !== b.delivery_date) return (a.delivery_date || '').localeCompare(b.delivery_date || '');
      if (a.delivery_time !== b.delivery_time) return (a.delivery_time || '').localeCompare(b.delivery_time || '');
      return b.id - a.id;
    });

    return orders;
  },

  async getOrder(id) {
    const oId = Number(id);
    const orderDoc = await this.db.collection('orders').doc(String(id)).get();
    if (!orderDoc.exists) throw new Error('Pedido no encontrado');

    const o = orderDoc.data();
    const [custDoc, itemsSnap, paymentsSnap, prodsSnap] = await Promise.all([
      this.db.collection('customers').doc(String(o.customer_id)).get(),
      this.db.collection('order_items').where('order_id', '==', oId).get(),
      this.db.collection('payments').where('order_id', '==', oId).get(),
      this.db.collection('products').get()
    ]);

    const prodsMap = {};
    prodsSnap.forEach(d => { prodsMap[Number(d.id)] = d.data(); });

    const items = [];
    itemsSnap.forEach(d => {
      const it = d.data();
      const p = prodsMap[Number(it.product_id)];
      items.push({
        ...it,
        id: d.id,
        product_name: p ? p.name : '—',
        product_category: p ? p.category : '',
        yield_unit: p ? p.yield_unit : ''
      });
    });

    const payments = [];
    paymentsSnap.forEach(d => { payments.push({ ...d.data(), id: d.id }); });
    payments.sort((a, b) => (a.payment_date || '').localeCompare(b.payment_date || ''));

    const cust = custDoc.exists ? custDoc.data() : null;
    return {
      ...o,
      id: oId,
      customer_name: cust ? cust.name : '—',
      customer_phone: cust ? cust.phone : '',
      customer_email: cust ? cust.email : '',
      customer_default_address: cust ? cust.address : '',
      pending_balance: (Number(o.total_amount) || 0) - (Number(o.total_paid) || 0),
      items,
      payments
    };
  },

  async createOrder(data) {
    const { customer_id, delivery_date, delivery_time, delivery_type, delivery_address, notes, items, initial_payment, deduct_inventory_now } = data;
    if (!customer_id || !delivery_date || !Array.isArray(items) || items.length === 0) {
      throw new Error('Cliente, fecha de entrega y al menos un producto son obligatorios');
    }

    const year = new Date().getFullYear();
    const allOrdersSnap = await this.db.collection('orders').get();
    const nextNum = (allOrdersSnap.size + 1).toString().padStart(4, '0');
    const orderNumber = `PED-${year}-${nextNum}`;

    let totalAmount = 0;
    let totalCost = 0;
    const processedItems = [];

    const prodsSnap = await this.db.collection('products').get();
    const prodsMap = {};
    prodsSnap.forEach(d => { prodsMap[Number(d.id)] = d.data(); });

    for (const it of items) {
      const prod = prodsMap[Number(it.product_id)];
      if (!prod) continue;

      const qty = parseFloat(it.quantity) || 1;
      const price = it.unit_price !== undefined ? parseFloat(it.unit_price) : prod.sale_price;
      const subtotal = Math.round(qty * price * 100) / 100;
      totalAmount += subtotal;

      // Calcular costo unitario
      const recipeSnap = await this.db.collection('recipes').where('product_id', '==', Number(it.product_id)).get();
      let recipeCost = 0;
      for (const rDoc of recipeSnap.docs) {
        const rData = rDoc.data();
        const ingDoc = await this.db.collection('ingredients').doc(String(rData.ingredient_id)).get();
        if (ingDoc.exists) {
          recipeCost += (Number(rData.quantity) || 0) * (Number(ingDoc.data().cost_per_unit) || 0);
        }
      }

      const yieldQty = Number(prod.yield_quantity) > 0 ? Number(prod.yield_quantity) : 1;
      const unitCost = Math.round((recipeCost / yieldQty) * 100) / 100;
      totalCost += Math.round(unitCost * qty * 100) / 100;

      processedItems.push({
        product_id: Number(it.product_id),
        quantity: qty,
        unit_price: price,
        unit_cost: unitCost,
        subtotal,
        notes: it.notes || ''
      });
    }

    const orderId = await this.getNextId('orders');
    const initialAmount = (initial_payment && parseFloat(initial_payment.amount)) || 0;

    let paymentStatus = 'PENDIENTE';
    if (initialAmount >= totalAmount) paymentStatus = 'PAGADO';
    else if (initialAmount > 0) paymentStatus = 'ABONO_PARCIAL';

    const newOrder = {
      id: orderId,
      order_number: orderNumber,
      customer_id: Number(customer_id),
      delivery_date,
      delivery_time: delivery_time || '12:00',
      delivery_type: delivery_type || 'RETIRO',
      delivery_address: delivery_address || '',
      status: 'PENDIENTE',
      payment_status: paymentStatus,
      total_amount: Math.round(totalAmount * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      total_paid: initialAmount,
      inventory_deducted: 0,
      notes: notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const batch = this.db.batch();
    const orderRef = this.db.collection('orders').doc(String(orderId));
    batch.set(orderRef, newOrder);

    for (const it of processedItems) {
      const itemRef = this.db.collection('order_items').doc();
      batch.set(itemRef, { ...it, order_id: orderId });
    }

    if (initialAmount > 0) {
      const payRef = this.db.collection('payments').doc();
      batch.set(payRef, {
        order_id: orderId,
        customer_id: Number(customer_id),
        amount: initialAmount,
        payment_method: initial_payment.payment_method || 'EFECTIVO',
        reference: initial_payment.reference || 'Anticipo al crear pedido',
        notes: 'Abono inicial registrado con la creación del pedido',
        payment_date: new Date().toISOString()
      });
    }

    await batch.commit();

    if (deduct_inventory_now) {
      await this._deductOrderInventory(orderId, orderNumber);
    }

    return newOrder;
  },

  async updateOrderStatus(id, status) {
    const oId = Number(id);
    const orderRef = this.db.collection('orders').doc(String(id));
    const doc = await orderRef.get();
    if (!doc.exists) throw new Error('Pedido no encontrado');

    const order = doc.data();

    if (['EN_PREPARACION', 'LISTO', 'ENTREGADO'].includes(status) && order.inventory_deducted === 0) {
      await this._deductOrderInventory(oId, order.order_number);
    }

    if (status === 'CANCELADO' && order.inventory_deducted === 1) {
      await this._restoreOrderInventory(oId, order.order_number);
    }

    await orderRef.update({
      status,
      updated_at: new Date().toISOString()
    });

    const updated = await orderRef.get();
    return { message: `Estado actualizado a ${status}`, order: { ...updated.data(), id: oId } };
  },

  async updateOrder(id, data) {
    const oId = Number(id);
    const orderRef = this.db.collection('orders').doc(String(id));
    const doc = await orderRef.get();
    if (!doc.exists) throw new Error('Pedido no encontrado');

    const updateData = { updated_at: new Date().toISOString() };
    if (data.delivery_date !== undefined) updateData.delivery_date = data.delivery_date;
    if (data.delivery_time !== undefined) updateData.delivery_time = data.delivery_time;
    if (data.delivery_type !== undefined) updateData.delivery_type = data.delivery_type;
    if (data.delivery_address !== undefined) updateData.delivery_address = data.delivery_address;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await orderRef.update(updateData);
    const updated = await orderRef.get();
    return { ...updated.data(), id: oId };
  },

  async deleteOrder(id) {
    const oId = Number(id);
    const orderRef = this.db.collection('orders').doc(String(id));
    const doc = await orderRef.get();
    if (!doc.exists) throw new Error('Pedido no encontrado');

    const order = doc.data();
    if (order.inventory_deducted === 1) {
      await this._restoreOrderInventory(oId, order.order_number);
    }

    const itemsSnap = await this.db.collection('order_items').where('order_id', '==', oId).get();
    const batchItems = this.db.batch();
    itemsSnap.forEach(d => batchItems.delete(d.ref));
    await batchItems.commit();

    const paysSnap = await this.db.collection('payments').where('order_id', '==', oId).get();
    const batchPays = this.db.batch();
    paysSnap.forEach(d => batchPays.delete(d.ref));
    await batchPays.commit();

    await orderRef.delete();
    return { message: `Pedido #${order.order_number} eliminado con éxito` };
  },

  async addPayment(data) {
    const { order_id, amount, payment_method, reference, notes } = data;
    const oId = Number(order_id);
    const payAmount = parseFloat(amount);
    if (!oId || isNaN(payAmount) || payAmount <= 0) {
      throw new Error('Debe indicar un pedido válido y un monto de pago mayor a cero');
    }

    const orderRef = this.db.collection('orders').doc(String(oId));
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) throw new Error('Pedido no encontrado');

    const order = orderDoc.data();
    const payRef = this.db.collection('payments').doc();
    await payRef.set({
      order_id: oId,
      customer_id: order.customer_id,
      amount: payAmount,
      payment_method: payment_method || 'EFECTIVO',
      reference: reference ? reference.trim() : '',
      notes: notes ? notes.trim() : '',
      payment_date: new Date().toISOString()
    });

    const paysSnap = await this.db.collection('payments').where('order_id', '==', oId).get();
    let totalPaid = 0;
    paysSnap.forEach(d => { totalPaid += Number(d.data().amount) || 0; });
    totalPaid = Math.round(totalPaid * 100) / 100;

    let paymentStatus = 'PENDIENTE';
    if (totalPaid >= order.total_amount) paymentStatus = 'PAGADO';
    else if (totalPaid > 0) paymentStatus = 'ABONO_PARCIAL';

    await orderRef.update({
      total_paid: totalPaid,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    });

    const updated = await this.getOrder(oId);
    return { message: 'Abono registrado con éxito', order: updated };
  },

  // ─── Métricas y Finanzas ────────────────────────────────────────────
  async getMetrics(period = 'month') {
    const [ordersSnap, ingsSnap, itemsSnap, prodsSnap] = await Promise.all([
      this.db.collection('orders').get(),
      this.db.collection('ingredients').get(),
      this.db.collection('order_items').get(),
      this.db.collection('products').get()
    ]);

    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const allOrders = [];
    ordersSnap.forEach(d => allOrders.push({ ...d.data(), id: Number(d.id) }));

    const filtered = allOrders.filter(o => {
      if (o.status === 'CANCELADO') return false;
      if (period === 'today') return o.delivery_date === today;
      if (period === 'week') return o.delivery_date >= weekAgo;
      if (period === 'month') return o.delivery_date >= monthStart;
      return true;
    });

    const totalRevenue = filtered.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const totalCost = filtered.reduce((s, o) => s + (Number(o.total_cost) || 0), 0);
    const totalCollected = filtered.reduce((s, o) => s + (Number(o.total_paid) || 0), 0);
    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? Math.round(((netProfit / totalRevenue) * 100) * 10) / 10 : 0;

    const globalReceivables = allOrders
      .filter(o => o.status !== 'CANCELADO' && o.payment_status !== 'PAGADO')
      .reduce((s, o) => s + ((Number(o.total_amount) || 0) - (Number(o.total_paid) || 0)), 0);

    // Top 5 productos
    const prodsMap = {};
    prodsSnap.forEach(d => { prodsMap[Number(d.id)] = d.data(); });

    const prodStats = {};
    itemsSnap.forEach(d => {
      const it = d.data();
      const pId = Number(it.product_id);
      const prod = prodsMap[pId];
      if (!prod) return;
      if (!prodStats[pId]) {
        prodStats[pId] = {
          id: pId,
          name: prod.name,
          category: prod.category,
          units_sold: 0,
          total_revenue: 0,
          total_cost: 0,
          profit: 0
        };
      }
      const qty = Number(it.quantity) || 0;
      const sub = Number(it.subtotal) || 0;
      const cost = (Number(it.unit_cost) || 0) * qty;
      prodStats[pId].units_sold += qty;
      prodStats[pId].total_revenue += sub;
      prodStats[pId].total_cost += cost;
      prodStats[pId].profit += (sub - cost);
    });

    const topProducts = Object.values(prodStats)
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, 5);

    // Gráfico diario (últimos 7 días)
    const dailyChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const dayOrders = allOrders.filter(o => o.delivery_date === d && o.status !== 'CANCELADO');
      const rev = dayOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
      const cst = dayOrders.reduce((s, o) => s + (Number(o.total_cost) || 0), 0);
      dailyChart.push({
        date: d,
        revenue: Math.round(rev * 100) / 100,
        cost: Math.round(cst * 100) / 100,
        profit: Math.round((rev - cst) * 100) / 100
      });
    }

    // Resumen inventario
    let totalInvValue = 0;
    let lowStockCount = 0;
    let totalIngs = 0;
    ingsSnap.forEach(d => {
      const ing = d.data();
      totalIngs++;
      const cur = Number(ing.current_stock) || 0;
      const min = Number(ing.min_stock) || 0;
      const cpu = Number(ing.cost_per_unit) || 0;
      if (cur <= min) lowStockCount++;
      totalInvValue += (cur * cpu);
    });

    return {
      period,
      summary: {
        total_orders: filtered.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        profit_margin_pct: profitMargin,
        total_collected: Math.round(totalCollected * 100) / 100,
        period_receivables: Math.round((totalRevenue - totalCollected) * 100) / 100,
        global_receivables: Math.round(globalReceivables * 100) / 100
      },
      inventory: {
        total_ingredients: totalIngs,
        low_stock_count: lowStockCount,
        total_inventory_value: Math.round(totalInvValue * 100) / 100
      },
      top_products: topProducts,
      daily_chart: dailyChart
    };
  },

  // ─── Métodos Auxiliares Internos ────────────────────────────────────
  async _deductOrderInventory(orderId, orderNumber) {
    const oId = Number(orderId);
    const itemsSnap = await this.db.collection('order_items').where('order_id', '==', oId).get();

    for (const doc of itemsSnap.docs) {
      const it = doc.data();
      const pDoc = await this.db.collection('products').doc(String(it.product_id)).get();
      if (!pDoc.exists) continue;
      const product = pDoc.data();

      const recSnap = await this.db.collection('recipes').where('product_id', '==', Number(it.product_id)).get();
      const yieldQty = Number(product.yield_quantity) > 0 ? Number(product.yield_quantity) : 1;
      const scaleFactor = (Number(it.quantity) || 1) / yieldQty;

      for (const rDoc of recSnap.docs) {
        const rData = rDoc.data();
        const required = Math.round((Number(rData.quantity) * scaleFactor) * 1000) / 1000;

        const ingRef = this.db.collection('ingredients').doc(String(rData.ingredient_id));
        const ingDoc = await ingRef.get();
        if (ingDoc.exists) {
          const curStock = Number(ingDoc.data().current_stock) || 0;
          const cost = Number(ingDoc.data().cost_per_unit) || 0;
          await ingRef.update({
            current_stock: Math.round((curStock - required) * 1000) / 1000,
            updated_at: new Date().toISOString()
          });

          await this.db.collection('inventory_movements').add({
            ingredient_id: Number(rData.ingredient_id),
            type: 'SALIDA_PEDIDO',
            quantity: required,
            unit_cost: cost,
            reference: `Pedido ${orderNumber}`,
            notes: `Insumos descontados para ${it.quantity} ${product.name}`,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    await this.db.collection('orders').doc(String(orderId)).update({ inventory_deducted: 1 });
  },

  async _restoreOrderInventory(orderId, orderNumber) {
    const oId = Number(orderId);
    const itemsSnap = await this.db.collection('order_items').where('order_id', '==', oId).get();

    for (const doc of itemsSnap.docs) {
      const it = doc.data();
      const pDoc = await this.db.collection('products').doc(String(it.product_id)).get();
      if (!pDoc.exists) continue;
      const product = pDoc.data();

      const recSnap = await this.db.collection('recipes').where('product_id', '==', Number(it.product_id)).get();
      const yieldQty = Number(product.yield_quantity) > 0 ? Number(product.yield_quantity) : 1;
      const scaleFactor = (Number(it.quantity) || 1) / yieldQty;

      for (const rDoc of recSnap.docs) {
        const rData = rDoc.data();
        const returned = Math.round((Number(rData.quantity) * scaleFactor) * 1000) / 1000;

        const ingRef = this.db.collection('ingredients').doc(String(rData.ingredient_id));
        const ingDoc = await ingRef.get();
        if (ingDoc.exists) {
          const curStock = Number(ingDoc.data().current_stock) || 0;
          const cost = Number(ingDoc.data().cost_per_unit) || 0;
          await ingRef.update({
            current_stock: Math.round((curStock + returned) * 1000) / 1000,
            updated_at: new Date().toISOString()
          });

          await this.db.collection('inventory_movements').add({
            ingredient_id: Number(rData.ingredient_id),
            type: 'ENTRADA',
            quantity: returned,
            unit_cost: cost,
            reference: `Cancelación/Borrado ${orderNumber}`,
            notes: 'Reingreso de insumos por cancelación de pedido',
            created_at: new Date().toISOString()
          });
        }
      }
    }

    await this.db.collection('orders').doc(String(orderId)).update({ inventory_deducted: 0 });
  },

  // ─── Sembrado Inicial de Demostración en Firestore ─────────────────
  async seedInitialData(force = false) {
    if (!this.isReady()) throw new Error('Firebase no está conectado. Configura tus credenciales primero.');

    const checkSnap = await this.db.collection('ingredients').limit(1).get();
    if (!checkSnap.empty && !force) {
      return { message: 'La base de datos de Firebase ya contiene información.' };
    }

    console.log('Sembrando datos iniciales en Google Firebase Cloud Firestore...');

    // 1. Settings
    await this.db.collection('settings').doc('general').set({
      bakery_name: 'Dulce Menta — Panadería & Repostería Artesanal',
      currency_symbol: '₡',
      phone: '+506 8888-1234',
      whatsapp: '50688881234',
      address: 'Barrio Escalante, 100m Este del Parque, San José, Costa Rica',
      low_stock_alerts_enabled: 'true'
    });

    // 2. Ingredientes
    const initialIngredients = [
      { id:1,  name:'Harina de Fuerza Especial',               category:'Harinas y Granos',         unit:'kg',     cost_per_unit:1100,  current_stock:45,   min_stock:15,  notes:'' },
      { id:2,  name:'Harina de Trigo Suave (Pastelería)',       category:'Harinas y Granos',         unit:'kg',     cost_per_unit:950,   current_stock:30,   min_stock:10,  notes:'' },
      { id:3,  name:'Mantequilla Sin Sal 82% Grasa',            category:'Grasas y Aceites',         unit:'kg',     cost_per_unit:5400,  current_stock:18,   min_stock:8,   notes:'' },
      { id:4,  name:'Azúcar Refinada',                          category:'Azúcares y Chocolates',    unit:'kg',     cost_per_unit:780,   current_stock:25,   min_stock:10,  notes:'' },
      { id:5,  name:'Azúcar Glass / En Polvo',                  category:'Azúcares y Chocolates',    unit:'kg',     cost_per_unit:1250,  current_stock:12,   min_stock:5,   notes:'' },
      { id:6,  name:'Huevos de Pastoreo',                       category:'Lácteos y Huevos',         unit:'unidad', cost_per_unit:120,   current_stock:180,  min_stock:60,  notes:'' },
      { id:7,  name:'Leche Entera Cremosa',                     category:'Lácteos y Huevos',         unit:'L',      cost_per_unit:980,   current_stock:22,   min_stock:10,  notes:'' },
      { id:8,  name:'Crema de Leche / Crema Dulce 35%',         category:'Lácteos y Huevos',         unit:'L',      cost_per_unit:2900,  current_stock:9,    min_stock:5,   notes:'' },
      { id:9,  name:'Queso Crema Tipo Filadelfia',               category:'Lácteos y Huevos',         unit:'kg',     cost_per_unit:5900,  current_stock:8,    min_stock:4,   notes:'' },
      { id:10, name:'Chocolate Amargo Belga 70%',                category:'Azúcares y Chocolates',    unit:'kg',     cost_per_unit:9800,  current_stock:6,    min_stock:3,   notes:'' },
      { id:11, name:'Cacao Puro en Polvo Alcalino',              category:'Azúcares y Chocolates',    unit:'kg',     cost_per_unit:8200,  current_stock:4,    min_stock:2,   notes:'' },
      { id:12, name:'Levadura Seca Instantánea',                 category:'Harinas y Granos',         unit:'g',      cost_per_unit:5.5,   current_stock:450,  min_stock:200, notes:'' },
      { id:13, name:'Polvo para Hornear',                        category:'Harinas y Granos',         unit:'g',      cost_per_unit:6.0,   current_stock:600,  min_stock:250, notes:'' },
      { id:14, name:'Esencia Pura de Vainilla Bourbon',          category:'Especias y Frutas',        unit:'ml',     cost_per_unit:25.0,  current_stock:350,  min_stock:150, notes:'' },
      { id:15, name:'Zanahorias Dulces Frescas',                 category:'Especias y Frutas',        unit:'kg',     cost_per_unit:1200,  current_stock:10,   min_stock:4,   notes:'' },
      { id:16, name:'Nueces Pecanas Seleccionadas',              category:'Especias y Frutas',        unit:'g',      cost_per_unit:16.0,  current_stock:950,  min_stock:500, notes:'' },
      { id:17, name:'Frutos Rojos Silvestres (Moras/Frambuesas)',category:'Especias y Frutas',        unit:'kg',     cost_per_unit:6500,  current_stock:3,    min_stock:4,   notes:'' },
      { id:18, name:'Sal Marina Fina',                           category:'Especias y Frutas',        unit:'g',      cost_per_unit:1.2,   current_stock:2000, min_stock:500, notes:'' },
      { id:19, name:'Caja Artesanal para Queque Grande',         category:'Empaques',                 unit:'unidad', cost_per_unit:850,   current_stock:15,   min_stock:20,  notes:'' },
      { id:20, name:'Caja Individual con Visor',                 category:'Empaques',                 unit:'unidad', cost_per_unit:350,   current_stock:65,   min_stock:30,  notes:'' },
      { id:21, name:'Bolsa de Papel Kraft Ecológica',            category:'Empaques',                 unit:'unidad', cost_per_unit:180,   current_stock:120,  min_stock:50,  notes:'' }
    ];

    const batchIng = this.db.batch();
    for (const ing of initialIngredients) {
      batchIng.set(this.db.collection('ingredients').doc(String(ing.id)), {
        ...ing,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    await batchIng.commit();

    // 3. Productos y recetas
    const initialProducts = [
      { id:1, name:'Queque de Zanahoria & Nuez con Frosting',      category:'Queques y Tartas',       description:'Bizcocho especiado con canela, nueces tostadas y cobertura suave de queso crema', sale_price:16500, yield_quantity:1,  yield_unit:'queque',     is_active:1 },
      { id:2, name:'Hogaza Rústica de Masa Madre',                  category:'Panadería Artesanal',    description:'Fermentación lenta de 24 horas, corteza crujiente y miga abierta alveolada',      sale_price:3800,  yield_quantity:1,  yield_unit:'hogaza',     is_active:1 },
      { id:3, name:'Galletas Chunky con Doble Chocolate (Docena)',  category:'Galletas',               description:'Galletas estilo Nueva York con trozos de chocolate belga', sale_price:8500, yield_quantity:12, yield_unit:'galletas',   is_active:1 },
      { id:4, name:'Tarta Sablé de Frutos Rojos',                   category:'Queques y Tartas',       description:'Base crocante de mantequilla rellena de suave crema pastelera', sale_price:14500, yield_quantity:1, yield_unit:'tarta', is_active:1 },
      { id:5, name:'Croissants Artesanales de Mantequilla (Pack x 4)', category:'Repostería Fina',    description:'Hojaldrado artesanal de capas perfectas con mantequilla pura al 82%',              sale_price:6000,  yield_quantity:4,  yield_unit:'croissants', is_active:1 }
    ];

    const batchProd = this.db.batch();
    for (const prod of initialProducts) {
      batchProd.set(this.db.collection('products').doc(String(prod.id)), {
        ...prod,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    await batchProd.commit();

    // 4. Recetas
    const initialRecipes = [
      // Queque zanahoria
      { product_id: 1, ingredient_id: 2, quantity: 0.35, notes: 'Harina suave' },
      { product_id: 1, ingredient_id: 4, quantity: 0.25, notes: 'Azúcar refinada' },
      { product_id: 1, ingredient_id: 6, quantity: 4,    notes: 'Huevos' },
      { product_id: 1, ingredient_id: 13,quantity: 12,   notes: 'Polvo de hornear' },
      { product_id: 1, ingredient_id: 14,quantity: 10,   notes: 'Vainilla' },
      { product_id: 1, ingredient_id: 15,quantity: 0.40, notes: 'Zanahorias' },
      { product_id: 1, ingredient_id: 16,quantity: 120,  notes: 'Nueces' },
      { product_id: 1, ingredient_id: 9, quantity: 0.30, notes: 'Queso crema' },
      { product_id: 1, ingredient_id: 3, quantity: 0.10, notes: 'Mantequilla' },
      { product_id: 1, ingredient_id: 5, quantity: 0.15, notes: 'Azúcar glass' },
      { product_id: 1, ingredient_id: 19,quantity: 1,    notes: 'Caja grande' },
      // Hogaza
      { product_id: 2, ingredient_id: 1, quantity: 0.50, notes: 'Harina de fuerza' },
      { product_id: 2, ingredient_id: 18,quantity: 10,   notes: 'Sal' },
      { product_id: 2, ingredient_id: 12,quantity: 2,    notes: 'Levadura' },
      { product_id: 2, ingredient_id: 21,quantity: 1,    notes: 'Bolsa kraft' }
    ];

    const batchRec = this.db.batch();
    for (const r of initialRecipes) {
      batchRec.set(this.db.collection('recipes').doc(), r);
    }
    await batchRec.commit();

    // 5. Clientes
    const initialCustomers = [
      { id:1, name:'María Laura Mora',   phone:'+506 8701-2345', email:'laura.mora@correo.cr',   address:'San Pedro, Montes de Oca, 200m Sur de la Iglesia', notes:'Prefiere entrega después de las 3pm' },
      { id:2, name:'Carlos Solís Vargas', phone:'+506 8812-9876', email:'csolis@empresacr.com',  address:'Barrio Escalante, Oficinas Torre Médica, Piso 4', notes:'Solicita factura electrónica' },
      { id:3, name:'Daniela Céspedes',    phone:'+506 7011-5432', email:'dani.cespedes@gmail.com',address:'Curridabat, Condominio Monterán, Casa 45',         notes:'Alérgica al maní (precaución con frutos secos)' }
    ];

    const batchCust = this.db.batch();
    for (const c of initialCustomers) {
      batchCust.set(this.db.collection('customers').doc(String(c.id)), {
        ...c,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    await batchCust.commit();

    return { message: '¡Datos iniciales sembrados con éxito en Google Firebase Cloud!' };
  }
};
