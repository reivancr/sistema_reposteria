// =====================================================================
//  CLIENTE API UNIVERSAL — Dulce Menta Bakery System
//  Soporta 3 Modos de Operación con Autodetección:
//  1. Servidor Local: Node.js + Express + SQLite (/api)
//  2. Google Firebase: Cloud Firestore (Persistencia en Nube en tiempo real)
//  3. Memoria Local: Navegador / LocalStorage (Modo Demo Offline)
// =====================================================================

// Safe Storage Helper (compatible con entornos sin localStorage)
const safeStorage = {
  getItem(k) {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null; } catch { return null; }
  },
  setItem(k, v) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, String(v)); } catch {}
  }
};

// ─── Utilidades de LocalStorage (Modo Offline / Demo) ────────────────
const DB = {
  _prefix: 'dulcementa_',
  get(table) {
    try {
      return JSON.parse(safeStorage.getItem(this._prefix + table) || 'null');
    } catch { return null; }
  },
  set(table, data) {
    safeStorage.setItem(this._prefix + table, JSON.stringify(data));
  },
  nextId(table) {
    const rows = this.get(table) || [];
    return rows.length > 0 ? Math.max(...rows.map(r => r.id || 0)) + 1 : 1;
  },
  now() { return new Date().toISOString(); },
  today() { return new Date().toISOString().split('T')[0]; },
  dayOffset(n) { return new Date(Date.now() + 86400000 * n).toISOString().split('T')[0]; }
};

function seedInitialLocalStorage() {
  if (DB.get('_seeded')) return;

  DB.set('settings', {
    bakery_name: 'Dulce Menta — Panadería & Repostería Artesanal',
    currency_symbol: '₡',
    phone: '+506 8888-1234',
    whatsapp: '50688881234',
    address: 'Barrio Escalante, 100m Este del Parque, San José, Costa Rica',
    low_stock_alerts_enabled: 'true'
  });

  const ingredients = [
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
  ].map(i => ({ ...i, created_at: DB.now(), updated_at: DB.now() }));
  DB.set('ingredients', ingredients);

  const movements = ingredients.map((ing, idx) => ({
    id: idx + 1,
    ingredient_id: ing.id,
    type: 'ENTRADA',
    quantity: ing.current_stock,
    unit_cost: ing.cost_per_unit,
    reference: 'Inventario Inicial',
    notes: 'Carga inicial de apertura de la panadería',
    created_at: DB.now()
  }));
  DB.set('inventory_movements', movements);

  const products = [
    { id:1, name:'Queque de Zanahoria & Nuez con Frosting',      category:'Queques y Tartas',       description:'Bizcocho especiado con canela, nueces tostadas y cobertura suave de queso crema', sale_price:16500, yield_quantity:1,  yield_unit:'queque',     is_active:1 },
    { id:2, name:'Hogaza Rústica de Masa Madre',                  category:'Panadería Artesanal',    description:'Fermentación lenta de 24 horas, corteza crujiente y miga abierta alveolada',      sale_price:3800,  yield_quantity:1,  yield_unit:'hogaza',     is_active:1 },
    { id:3, name:'Galletas Chunky con Doble Chocolate (Docena)',  category:'Galletas',               description:'Galletas estilo Nueva York con trozos de chocolate belga', sale_price:8500, yield_quantity:12, yield_unit:'galletas',   is_active:1 },
    { id:4, name:'Tarta Sablé de Frutos Rojos',                   category:'Queques y Tartas',       description:'Base crocante de mantequilla rellena de suave crema pastelera', sale_price:14500, yield_quantity:1, yield_unit:'tarta', is_active:1 },
    { id:5, name:'Croissants Artesanales de Mantequilla (Pack x 4)', category:'Repostería Fina',    description:'Hojaldrado artesanal de capas perfectas con mantequilla pura al 82%',              sale_price:6000,  yield_quantity:4,  yield_unit:'croissants', is_active:1 }
  ].map(p => ({ ...p, created_at: DB.now(), updated_at: DB.now() }));
  DB.set('products', products);

  const recipes = [
    { id:1,  product_id:1, ingredient_id:2,  quantity:0.35, notes:'Harina suave' },
    { id:2,  product_id:1, ingredient_id:4,  quantity:0.25, notes:'Azúcar refinada' },
    { id:3,  product_id:1, ingredient_id:6,  quantity:4,    notes:'Huevos de pastoreo' },
    { id:4,  product_id:1, ingredient_id:13, quantity:12,   notes:'Polvo de hornear' },
    { id:5,  product_id:1, ingredient_id:14, quantity:10,   notes:'Vainilla bourbon' },
    { id:6,  product_id:1, ingredient_id:15, quantity:0.40, notes:'Zanahorias dulces' },
    { id:7,  product_id:1, ingredient_id:16, quantity:120,  notes:'Nueces picadas' },
    { id:8,  product_id:1, ingredient_id:9,  quantity:0.30, notes:'Queso crema para frosting' },
    { id:9,  product_id:1, ingredient_id:3,  quantity:0.10, notes:'Mantequilla frosting' },
    { id:10, product_id:1, ingredient_id:5,  quantity:0.15, notes:'Azúcar glass frosting' },
    { id:11, product_id:1, ingredient_id:19, quantity:1,    notes:'Caja artesanal grande' },
    { id:12, product_id:2, ingredient_id:1,  quantity:0.50, notes:'Harina de fuerza' },
    { id:13, product_id:2, ingredient_id:18, quantity:10,   notes:'Sal fina' },
    { id:14, product_id:2, ingredient_id:12, quantity:2,    notes:'Levadura seca' },
    { id:15, product_id:2, ingredient_id:21, quantity:1,    notes:'Bolsa kraft' }
  ];
  DB.set('recipes', recipes);

  const customers = [
    { id:1, name:'María Laura Mora',    phone:'+506 8701-2345', email:'laura.mora@correo.cr',   address:'San Pedro, Montes de Oca, 200m Sur de la Iglesia', notes:'Prefiere entrega después de las 3pm' },
    { id:2, name:'Carlos Solís Vargas',  phone:'+506 8812-9876', email:'csolis@empresacr.com',  address:'Barrio Escalante, Oficinas Torre Médica, Piso 4', notes:'Solicita factura electrónica' },
    { id:3, name:'Daniela Céspedes',     phone:'+506 7011-5432', email:'dani.cespedes@gmail.com',address:'Curridabat, Condominio Monterán, Casa 45',         notes:'Alérgica al maní (precaución con frutos secos)' }
  ].map(c => ({ ...c, created_at: DB.now(), updated_at: DB.now() }));
  DB.set('customers', customers);

  const orders = [
    { id:1, order_number:'PED-2026-0001', customer_id:1, delivery_date:DB.today(), delivery_time:'14:00', delivery_type:'DOMICILIO', delivery_address:'San Pedro, Montes de Oca, 200m Sur de la Iglesia', status:'EN_PREPARACION', payment_status:'ABONO_PARCIAL', total_amount:16500, total_cost:4450, total_paid:10000, inventory_deducted:1, notes:'Dedicatoria: ¡Feliz Cumpleaños Mamá!', created_at:DB.now(), updated_at:DB.now() },
    { id:2, order_number:'PED-2026-0002', customer_id:2, delivery_date:DB.dayOffset(1), delivery_time:'10:30', delivery_type:'RETIRO', delivery_address:'', status:'PENDIENTE', payment_status:'PAGADO', total_amount:7600, total_cost:1680, total_paid:7600, inventory_deducted:0, notes:'Dos hogazas bien doradas', created_at:DB.now(), updated_at:DB.now() },
    { id:3, order_number:'PED-2026-0003', customer_id:3, delivery_date:DB.dayOffset(2), delivery_time:'16:00', delivery_type:'DOMICILIO', delivery_address:'Curridabat, Condominio Monterán, Casa 45', status:'PENDIENTE', payment_status:'PENDIENTE', total_amount:8500, total_cost:2900, total_paid:0, inventory_deducted:0, notes:'Sin nueces en ningún producto', created_at:DB.now(), updated_at:DB.now() }
  ];
  DB.set('orders', orders);

  const orderItems = [
    { id:1, order_id:1, product_id:1, quantity:1, unit_price:16500, unit_cost:4450, subtotal:16500, notes:'Decorado con nueces en bordes' },
    { id:2, order_id:2, product_id:2, quantity:2, unit_price:3800,  unit_cost:840,  subtotal:7600,  notes:'Corte tradicional espiga' },
    { id:3, order_id:3, product_id:3, quantity:1, unit_price:8500,  unit_cost:2900, subtotal:8500,  notes:'Docena completa' }
  ];
  DB.set('order_items', orderItems);

  const payments = [
    { id:1, order_id:1, customer_id:1, amount:10000, payment_method:'SINPE_TRANSFERENCIA', reference:'#SINPE-89410', notes:'Abono inicial 60%', payment_date:DB.now() },
    { id:2, order_id:2, customer_id:2, amount:7600,  payment_method:'TARJETA',             reference:'AUTH-55410',  notes:'Pago total en mostrador', payment_date:DB.now() }
  ];
  DB.set('payments', payments);
  DB.set('productions', []);

  DB.set('_seeded', true);
}

// ─── Helpers para Modo LocalStorage ──────────────────────────────────
function getIngredients()     { return DB.get('ingredients') || []; }
function getProducts()        { return DB.get('products') || []; }
function getRecipes()         { return DB.get('recipes') || []; }
function getCustomers()       { return DB.get('customers') || []; }
function getOrders()          { return DB.get('orders') || []; }
function getOrderItems()      { return DB.get('order_items') || []; }
function getPayments()        { return DB.get('payments') || []; }
function getMovements()       { return DB.get('inventory_movements') || []; }
function getProductions()     { return DB.get('productions') || []; }
function getLocalSettings()   { return DB.get('settings') || {}; }

function calcRecipeCost(productId) {
  const allRecipes = getRecipes();
  const allIngs    = getIngredients();
  return allRecipes
    .filter(r => r.product_id == productId)
    .reduce((sum, r) => {
      const ing = allIngs.find(i => i.id == r.ingredient_id);
      return sum + (r.quantity * (ing ? ing.cost_per_unit : 0));
    }, 0);
}

function stockStatus(ing) {
  if (ing.current_stock <= 0) return 'AGOTADO';
  if (ing.current_stock <= ing.min_stock) return 'BAJO';
  return 'OPTIMO';
}

function enrichProduct(p) {
  const totalCost = calcRecipeCost(p.id);
  const yieldQty = p.yield_quantity > 0 ? p.yield_quantity : 1;
  const unitCost = totalCost / yieldQty;
  const grossProfit = p.sale_price - totalCost;
  const profitMarginPct = p.sale_price > 0 ? (grossProfit / p.sale_price) * 100 : 0;
  const recipeItems = getRecipes().filter(r => r.product_id == p.id);
  return {
    ...p,
    total_recipe_cost: Math.round(totalCost * 100) / 100,
    unit_cost: Math.round(unitCost * 100) / 100,
    gross_profit: Math.round(grossProfit * 100) / 100,
    profit_margin_pct: Math.round(profitMarginPct * 10) / 10,
    ingredients_count: recipeItems.length
  };
}

function enrichOrder(o) {
  const cust = getCustomers().find(c => c.id == o.customer_id);
  const items = getOrderItems().filter(i => i.order_id == o.id);
  return {
    ...o,
    customer_name: cust ? cust.name : '—',
    customer_phone: cust ? cust.phone : '',
    pending_balance: Math.round((o.total_amount - o.total_paid) * 100) / 100,
    items_count: items.length
  };
}

function deductLocalOrderInventory(orderId, orderNumber) {
  const allIngs = getIngredients();
  const items = getOrderItems().filter(i => i.order_id == orderId);
  for (const item of items) {
    const product = getProducts().find(p => p.id == item.product_id);
    if (!product) continue;
    const recipeItems = getRecipes().filter(r => r.product_id == item.product_id);
    const yieldQty = product.yield_quantity > 0 ? product.yield_quantity : 1;
    const scaleFactor = item.quantity / yieldQty;

    for (const rItem of recipeItems) {
      const required = Math.round((rItem.quantity * scaleFactor) * 1000) / 1000;
      const ing = allIngs.find(i => i.id == rItem.ingredient_id);
      if (ing) {
        ing.current_stock = Math.round((ing.current_stock - required) * 1000) / 1000;
        ing.updated_at = DB.now();
      }
    }
  }
  DB.set('ingredients', allIngs);
  const orders = getOrders();
  const o = orders.find(x => x.id == orderId);
  if (o) { o.inventory_deducted = 1; DB.set('orders', orders); }
}

function restoreLocalOrderInventory(orderId, orderNumber) {
  const allIngs = getIngredients();
  const items = getOrderItems().filter(i => i.order_id == orderId);
  for (const item of items) {
    const product = getProducts().find(p => p.id == item.product_id);
    if (!product) continue;
    const recipeItems = getRecipes().filter(r => r.product_id == item.product_id);
    const yieldQty = product.yield_quantity > 0 ? product.yield_quantity : 1;
    const scaleFactor = item.quantity / yieldQty;

    for (const rItem of recipeItems) {
      const returned = Math.round((rItem.quantity * scaleFactor) * 1000) / 1000;
      const ing = allIngs.find(i => i.id == rItem.ingredient_id);
      if (ing) {
        ing.current_stock = Math.round((ing.current_stock + returned) * 1000) / 1000;
        ing.updated_at = DB.now();
      }
    }
  }
  DB.set('ingredients', allIngs);
  const orders = getOrders();
  const o = orders.find(x => x.id == orderId);
  if (o) { o.inventory_deducted = 0; DB.set('orders', orders); }
}

// ─── OBJETO API PRINCIPAL ─────────────────────────────────────────────
const API = {
  baseUrl: '/api',
  activeBackend: 'detecting', // 'local_server' | 'firebase' | 'local_storage'

  // Determinar backend activo
  async detectBackend() {
    const pref = safeStorage.getItem('dulcementa_data_mode') || 'auto';

    if (pref === 'firebase') {
      if (typeof FirebaseService !== 'undefined' && FirebaseService.isReady()) {
        this.activeBackend = 'firebase';
        return 'firebase';
      }
    }

    if (pref === 'local_storage') {
      seedInitialLocalStorage();
      this.activeBackend = 'local_storage';
      return 'local_storage';
    }

    if (pref === 'local_server') {
      this.activeBackend = 'local_server';
      return 'local_server';
    }

    // Modo AUTO:
    // 1. Probar backend local Express si responde en /api/health
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 1200);
      const res = await fetch(`${this.baseUrl}/health`, { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) {
        this.activeBackend = 'local_server';
        return 'local_server';
      }
    } catch (_) {}

    // 2. Si no hay backend Express, probar si Firebase está configurado
    if (typeof FirebaseService !== 'undefined' && FirebaseService.isReady()) {
      this.activeBackend = 'firebase';
      return 'firebase';
    }

    // 3. Fallback a LocalStorage offline
    seedInitialLocalStorage();
    this.activeBackend = 'local_storage';
    return 'local_storage';
  },

  getActiveMode() {
    return this.activeBackend;
  },

  setBackendMode(mode) {
    safeStorage.setItem('dulcementa_data_mode', mode);
    this.activeBackend = mode;
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || `Error ${response.status}: ${response.statusText}`);
        error.data = data;
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (err) {
      console.error(`Error en API (${endpoint}):`, err);
      throw err;
    }
  },

  // ── Insumos e Inventario ──────────────────────────────────────────
  async getInventory() {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getInventory();
    if (this.activeBackend === 'local_server') return this.request('/inventory');

    const ings = getIngredients().map(i => ({
      ...i,
      stock_status: stockStatus(i),
      total_value: Math.round(i.current_stock * i.cost_per_unit * 100) / 100
    }));
    const order = { AGOTADO: 1, BAJO: 2, OPTIMO: 3 };
    ings.sort((a, b) => order[a.stock_status] - order[b.stock_status] || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    return Promise.resolve(ings);
  },

  async getInventoryAlerts() {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getInventoryAlerts();
    if (this.activeBackend === 'local_server') return this.request('/inventory/alerts');

    const alerts = getIngredients()
      .filter(i => i.current_stock <= i.min_stock)
      .map(i => ({
        ...i,
        deficit: Math.round((i.min_stock - i.current_stock) * 1000) / 1000,
        alert_level: i.current_stock <= 0 ? 'AGOTADO' : 'BAJO'
      }))
      .sort((a, b) => a.current_stock - b.current_stock);
    return Promise.resolve(alerts);
  },

  async createIngredient(data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.createIngredient(data);
    if (this.activeBackend === 'local_server') return this.request('/inventory', { method: 'POST', body: JSON.stringify(data) });

    const ings = getIngredients();
    const newId = DB.nextId('ingredients');
    const newIng = {
      id: newId,
      name: data.name.trim(),
      category: data.category.trim(),
      unit: data.unit.trim(),
      cost_per_unit: parseFloat(data.cost_per_unit) || 0,
      current_stock: parseFloat(data.current_stock) || 0,
      min_stock: parseFloat(data.min_stock) || 0,
      notes: data.notes ? data.notes.trim() : '',
      created_at: DB.now(),
      updated_at: DB.now()
    };
    ings.push(newIng);
    DB.set('ingredients', ings);
    return Promise.resolve(newIng);
  },

  async updateIngredient(id, data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.updateIngredient(id, data);
    if (this.activeBackend === 'local_server') return this.request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) });

    const ings = getIngredients();
    const idx = ings.findIndex(i => i.id == id);
    if (idx < 0) throw new Error('Insumo no encontrado');
    const cur = ings[idx];
    ings[idx] = {
      ...cur,
      name: data.name !== undefined ? data.name.trim() : cur.name,
      category: data.category !== undefined ? data.category.trim() : cur.category,
      unit: data.unit !== undefined ? data.unit.trim() : cur.unit,
      cost_per_unit: data.cost_per_unit !== undefined ? parseFloat(data.cost_per_unit) : cur.cost_per_unit,
      min_stock: data.min_stock !== undefined ? parseFloat(data.min_stock) : cur.min_stock,
      notes: data.notes !== undefined ? data.notes.trim() : cur.notes,
      updated_at: DB.now()
    };
    DB.set('ingredients', ings);
    return Promise.resolve(ings[idx]);
  },

  async adjustStock(id, data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.adjustStock(id, data);
    if (this.activeBackend === 'local_server') return this.request(`/inventory/${id}/adjust`, { method: 'POST', body: JSON.stringify(data) });

    const ings = getIngredients();
    const ing = ings.find(i => i.id == id);
    if (!ing) throw new Error('Insumo no encontrado');
    const qty = parseFloat(data.quantity);
    if (isNaN(qty) || qty <= 0) throw new Error('Cantidad debe ser mayor a cero');

    let newStock = ing.current_stock;
    const newCost = data.unit_cost !== undefined && data.unit_cost !== '' ? parseFloat(data.unit_cost) : ing.cost_per_unit;
    if (data.type === 'ENTRADA') newStock += qty;
    else if (data.type === 'MERMA' || data.type === 'AJUSTE_RESTA') newStock = Math.max(0, newStock - qty);
    else if (data.type === 'AJUSTE_EXACTO') newStock = qty;

    ing.current_stock = newStock;
    ing.cost_per_unit = newCost;
    ing.updated_at = DB.now();
    DB.set('ingredients', ings);
    return Promise.resolve({ message: 'Stock actualizado con éxito', ingredient: ing });
  },

  async deleteIngredient(id, force = false) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.deleteIngredient(id, force);
    if (this.activeBackend === 'local_server') return this.request(`/inventory/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });

    const usedInRecipes = getRecipes().filter(r => r.ingredient_id == id);
    if (usedInRecipes.length > 0 && !force) {
      const err = new Error(`El insumo está siendo utilizado en ${usedInRecipes.length} receta(s). ¿Deseas forzar la eliminación y retirarlo de todas las recetas?`);
      err.data = { in_recipes: true, recipes_count: usedInRecipes.length };
      throw err;
    }
    let ings = getIngredients();
    const ing = ings.find(i => i.id == id);
    if (!ing) throw new Error('Insumo no encontrado');
    if (force && usedInRecipes.length > 0) {
      DB.set('recipes', getRecipes().filter(r => r.ingredient_id != id));
    }
    DB.set('ingredients', ings.filter(i => i.id != id));
    return Promise.resolve({ message: `Insumo '${ing.name}' eliminado con éxito` });
  },

  // ── Productos y Recetas ──────────────────────────────────────────
  async getProducts() {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getProducts();
    if (this.activeBackend === 'local_server') return this.request('/products');

    return Promise.resolve(getProducts().filter(p => p.is_active).map(enrichProduct));
  },

  async getProduct(id) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getProduct(id);
    if (this.activeBackend === 'local_server') return this.request(`/products/${id}`);

    const p = getProducts().find(x => x.id == id);
    if (!p) throw new Error('Producto no encontrado');
    const recipeIngIds = getRecipes().filter(r => r.product_id == id);
    const allIngs = getIngredients();
    const items = recipeIngIds.map(r => {
      const ing = allIngs.find(i => i.id === r.ingredient_id);
      return {
        recipe_item_id: r.id,
        ingredient_id: r.ingredient_id,
        recipe_quantity: r.quantity,
        recipe_notes: r.notes || '',
        ingredient_name: ing ? ing.name : '—',
        ingredient_category: ing ? ing.category : '',
        ingredient_unit: ing ? ing.unit : '',
        cost_per_unit: ing ? ing.cost_per_unit : 0,
        current_stock: ing ? ing.current_stock : 0,
        ingredient_total_cost: Math.round(r.quantity * (ing ? ing.cost_per_unit : 0) * 100) / 100
      };
    });
    const enriched = enrichProduct(p);
    return Promise.resolve({ ...enriched, recipe: items });
  },

  async createProduct(data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.createProduct(data);
    if (this.activeBackend === 'local_server') return this.request('/products', { method: 'POST', body: JSON.stringify(data) });

    const prods = getProducts();
    const newId = DB.nextId('products');
    const newProd = {
      id: newId,
      name: data.name.trim(),
      category: data.category.trim(),
      description: data.description || '',
      sale_price: parseFloat(data.sale_price) || 0,
      yield_quantity: parseFloat(data.yield_quantity) || 1,
      yield_unit: data.yield_unit || 'unidad',
      is_active: 1,
      created_at: DB.now(),
      updated_at: DB.now()
    };
    prods.push(newProd);
    DB.set('products', prods);

    if (data.recipe && Array.isArray(data.recipe)) {
      const allRecipes = getRecipes();
      let nextRId = DB.nextId('recipes');
      for (const item of data.recipe) {
        if (item.ingredient_id && parseFloat(item.quantity) > 0) {
          allRecipes.push({ id: nextRId++, product_id: newId, ingredient_id: Number(item.ingredient_id), quantity: parseFloat(item.quantity), notes: item.notes || '' });
        }
      }
      DB.set('recipes', allRecipes);
    }
    return Promise.resolve(newProd);
  },

  async updateProduct(id, data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.updateProduct(id, data);
    if (this.activeBackend === 'local_server') return this.request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });

    const prods = getProducts();
    const p = prods.find(x => x.id == id);
    if (!p) throw new Error('Producto no encontrado');
    if (data.name !== undefined) p.name = data.name.trim();
    if (data.category !== undefined) p.category = data.category.trim();
    if (data.description !== undefined) p.description = data.description.trim();
    if (data.sale_price !== undefined) p.sale_price = parseFloat(data.sale_price) || 0;
    if (data.yield_quantity !== undefined) p.yield_quantity = parseFloat(data.yield_quantity) || 1;
    if (data.yield_unit !== undefined) p.yield_unit = data.yield_unit.trim();
    if (data.is_active !== undefined) p.is_active = Number(data.is_active);
    p.updated_at = DB.now();
    DB.set('products', prods);
    return Promise.resolve(p);
  },

  async saveRecipe(id, items) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.saveRecipe(id, items);
    if (this.activeBackend === 'local_server') return this.request(`/products/${id}/recipe`, { method: 'POST', body: JSON.stringify({ items }) });

    let recipes = getRecipes().filter(r => r.product_id != id);
    let nextId = DB.nextId('recipes');
    for (const item of items) {
      if (item.ingredient_id && parseFloat(item.quantity) > 0) {
        recipes.push({ id: nextId++, product_id: Number(id), ingredient_id: Number(item.ingredient_id), quantity: parseFloat(item.quantity), notes: item.notes || '' });
      }
    }
    DB.set('recipes', recipes);
    const prodDetails = await this.getProduct(id);
    return Promise.resolve({ message: 'Receta actualizada con éxito', recipe: prodDetails.recipe, total_recipe_cost: prodDetails.total_recipe_cost });
  },

  async deleteRecipe(id) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.deleteRecipe(id);
    if (this.activeBackend === 'local_server') return this.request(`/products/${id}/recipe`, { method: 'DELETE' });

    DB.set('recipes', getRecipes().filter(r => r.product_id != id));
    return Promise.resolve({ message: 'Receta eliminada con éxito' });
  },

  async deleteProduct(id, force = false) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.deleteProduct(id, force);
    if (this.activeBackend === 'local_server') return this.request(`/products/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });

    const usedInOrder = getOrderItems().filter(i => i.product_id == id);
    if (usedInOrder.length > 0 && !force) {
      const err = new Error(`El producto tiene ${usedInOrder.length} pedidos asociados en el historial. ¿Deseas eliminarlo de forma definitiva junto con sus registros asociados?`);
      err.data = { has_orders: true, orders_count: usedInOrder.length };
      throw err;
    }
    const prods = getProducts();
    const prod = prods.find(p => p.id == id);
    if (!prod) throw new Error('Producto no encontrado');
    if (force && usedInOrder.length > 0) {
      DB.set('order_items', getOrderItems().filter(i => i.product_id != id));
    }
    DB.set('recipes', getRecipes().filter(r => r.product_id != id));
    DB.set('products', prods.filter(p => p.id != id));
    return Promise.resolve({ message: `Producto '${prod.name}' y su receta eliminados con éxito` });
  },

  // ── Proyección y Producción ──────────────────────────────────────
  async projectProduction(productId, quantity) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.projectProduction(productId, quantity);
    if (this.activeBackend === 'local_server') return this.request('/production/project', { method: 'POST', body: JSON.stringify({ product_id: productId, quantity }) });

    const product = await this.getProduct(productId);
    const qty = parseFloat(quantity);
    const recipeItems = getRecipes().filter(r => r.product_id == productId);
    if (recipeItems.length === 0) throw new Error('Este producto no tiene una receta configurada todavía.');
    const yieldQty = product.yield_quantity > 0 ? product.yield_quantity : 1;
    const scaleFactor = qty / yieldQty;
    const allIngs = getIngredients();
    let totalCost = 0;
    let hasShortage = false;

    const ingredients = recipeItems.map(r => {
      const ing = allIngs.find(i => i.id == r.ingredient_id) || {};
      const required = Math.round((r.quantity * scaleFactor) * 1000) / 1000;
      const cost = Math.round(required * (ing.cost_per_unit || 0) * 100) / 100;
      totalCost += cost;
      const isEnough = (ing.current_stock || 0) >= required;
      if (!isEnough) hasShortage = true;
      return {
        ingredient_id: r.ingredient_id,
        name: ing.name || '—',
        category: ing.category || '',
        unit: ing.unit || '',
        unit_cost: ing.cost_per_unit || 0,
        base_quantity: r.quantity,
        required_quantity: required,
        current_stock: ing.current_stock || 0,
        is_enough: isEnough,
        shortage: isEnough ? 0 : Math.round((required - (ing.current_stock || 0)) * 1000) / 1000,
        total_cost: cost
      };
    });

    const expectedRevenue = Math.round(((qty / yieldQty) * product.sale_price) * 100) / 100;
    const expectedProfit = Math.round((expectedRevenue - totalCost) * 100) / 100;
    const margin = expectedRevenue > 0 ? Math.round(((expectedProfit / expectedRevenue) * 100) * 10) / 10 : 0;

    return Promise.resolve({
      product: { id: product.id, name: product.name, category: product.category, sale_price: product.sale_price, yield_quantity: product.yield_quantity, yield_unit: product.yield_unit },
      production_plan: { quantity_to_produce: qty, scale_factor: Math.round(scaleFactor * 1000) / 1000, batches: Math.round(scaleFactor * 10) / 10, ingredients, has_shortage: hasShortage, total_cost: Math.round(totalCost * 100) / 100, expected_revenue: expectedRevenue, expected_profit: expectedProfit, profit_margin_pct: margin }
    });
  },

  async executeProduction(productId, quantity, notes, allowNegative = false) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.executeProduction(productId, quantity, notes, allowNegative);
    if (this.activeBackend === 'local_server') {
      return this.request('/production/execute', { method: 'POST', body: JSON.stringify({ product_id: productId, quantity, notes, allow_negative_stock: allowNegative }) });
    }

    const proj = await this.projectProduction(productId, quantity);
    const plan = proj.production_plan;
    if (!allowNegative && plan.has_shortage) {
      const shortItem = plan.ingredients.find(i => !i.is_enough);
      throw new Error(`Stock insuficiente para '${shortItem.name}'. Requerido: ${shortItem.required_quantity} ${shortItem.unit}, Disponible: ${shortItem.current_stock} ${shortItem.unit}.`);
    }

    const allIngs = getIngredients();
    for (const item of plan.ingredients) {
      const ing = allIngs.find(i => i.id == item.ingredient_id);
      if (ing) {
        ing.current_stock = Math.round((ing.current_stock - item.required_quantity) * 1000) / 1000;
        ing.updated_at = DB.now();
      }
    }
    DB.set('ingredients', allIngs);

    const prods = getProductions();
    const newId = DB.nextId('productions');
    prods.push({ id: newId, product_id: Number(productId), quantity: Number(quantity), total_cost: plan.total_cost, expected_revenue: plan.expected_revenue, notes: notes || '', production_date: DB.now() });
    DB.set('productions', prods);
    return Promise.resolve({ message: '¡Producción ejecutada con éxito! Insumos descontados del inventario.', production_id: newId, product_name: proj.product.name, quantity_produced: quantity, total_cost_consumed: plan.total_cost });
  },

  // ── Clientes ─────────────────────────────────────────────────────
  async getCustomers() {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getCustomers();
    if (this.activeBackend === 'local_server') return this.request('/customers');

    const orders = getOrders();
    const custs = getCustomers().map(c => {
      const cOrders = orders.filter(o => o.customer_id == c.id && o.status !== 'CANCELADO');
      const totalPurchases = cOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const totalPaid = cOrders.reduce((s, o) => s + (o.total_paid || 0), 0);
      return {
        ...c,
        total_orders: cOrders.length,
        total_purchases: Math.round(totalPurchases * 100) / 100,
        total_paid: Math.round(totalPaid * 100) / 100,
        pending_balance: Math.round((totalPurchases - totalPaid) * 100) / 100
      };
    });
    custs.sort((a, b) => b.pending_balance - a.pending_balance || a.name.localeCompare(b.name));
    return Promise.resolve(custs);
  },

  async getCustomer(id) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getCustomer(id);
    if (this.activeBackend === 'local_server') return this.request(`/customers/${id}`);

    const c = getCustomers().find(x => x.id == id);
    if (!c) throw new Error('Cliente no encontrado');
    const orders = getOrders().filter(o => o.customer_id == id).map(o => ({ ...o, balance: o.total_amount - o.total_paid }));
    const payments = getPayments().filter(p => p.customer_id == id);
    const valid = orders.filter(o => o.status !== 'CANCELADO');
    return Promise.resolve({
      ...c,
      orders,
      payments,
      stats: {
        total_orders: orders.length,
        total_purchases: valid.reduce((s, o) => s + o.total_amount, 0),
        total_paid: valid.reduce((s, o) => s + o.total_paid, 0),
        pending_balance: valid.reduce((s, o) => s + o.balance, 0)
      }
    });
  },

  async createCustomer(data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.createCustomer(data);
    if (this.activeBackend === 'local_server') return this.request('/customers', { method: 'POST', body: JSON.stringify(data) });

    const all = getCustomers();
    const newId = DB.nextId('customers');
    const newC = { id: newId, name: data.name.trim(), phone: data.phone || '', email: data.email || '', address: data.address || '', notes: data.notes || '', created_at: DB.now(), updated_at: DB.now() };
    all.push(newC);
    DB.set('customers', all);
    return Promise.resolve(newC);
  },

  async updateCustomer(id, data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.updateCustomer(id, data);
    if (this.activeBackend === 'local_server') return this.request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

    const all = getCustomers();
    const c = all.find(x => x.id == id);
    if (!c) throw new Error('Cliente no encontrado');
    if (data.name !== undefined) c.name = data.name.trim();
    if (data.phone !== undefined) c.phone = data.phone.trim();
    if (data.email !== undefined) c.email = data.email.trim();
    if (data.address !== undefined) c.address = data.address.trim();
    if (data.notes !== undefined) c.notes = data.notes.trim();
    c.updated_at = DB.now();
    DB.set('customers', all);
    return Promise.resolve(c);
  },

  async deleteCustomer(id, force = false) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.deleteCustomer(id, force);
    if (this.activeBackend === 'local_server') return this.request(`/customers/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });

    const custOrders = getOrders().filter(o => o.customer_id == id);
    if (custOrders.length > 0 && !force) {
      const err = new Error(`El cliente tiene ${custOrders.length} pedido(s) registrados. ¿Deseas forzar la eliminación de este cliente y todo su historial de pedidos y pagos?`);
      err.data = { has_orders: true, orders_count: custOrders.length };
      throw err;
    }
    const all = getCustomers();
    const c = all.find(x => x.id == id);
    if (!c) throw new Error('Cliente no encontrado');
    if (force && custOrders.length > 0) {
      for (const o of custOrders) {
        if (o.inventory_deducted === 1) restoreLocalOrderInventory(o.id, o.order_number);
        DB.set('order_items', getOrderItems().filter(i => i.order_id != o.id));
        DB.set('payments', getPayments().filter(p => p.order_id != o.id));
      }
      DB.set('orders', getOrders().filter(o => o.customer_id != id));
    }
    DB.set('customers', all.filter(x => x.id != id));
    return Promise.resolve({ message: `Cliente '${c.name}' eliminado con éxito` });
  },

  // ── Pedidos ──────────────────────────────────────────────────────
  async getOrders(params = {}) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getOrders(params);
    if (this.activeBackend === 'local_server') {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/orders${qs ? '?' + qs : ''}`);
    }

    const today = DB.today();
    let orders = getOrders().map(enrichOrder);
    if (params.status) orders = orders.filter(o => o.status === params.status);
    if (params.payment_status) orders = orders.filter(o => o.payment_status === params.payment_status);
    if (params.date) orders = orders.filter(o => o.delivery_date === params.date);
    else if (params.period === 'today') orders = orders.filter(o => o.delivery_date === today);
    else if (params.period === 'tomorrow') orders = orders.filter(o => o.delivery_date === DB.dayOffset(1));
    else if (params.period === 'week') orders = orders.filter(o => o.delivery_date >= today && o.delivery_date <= DB.dayOffset(7));

    orders.sort((a, b) => (a.delivery_date !== b.delivery_date ? a.delivery_date.localeCompare(b.delivery_date) : b.id - a.id));
    return Promise.resolve(orders);
  },

  async getOrder(id) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getOrder(id);
    if (this.activeBackend === 'local_server') return this.request(`/orders/${id}`);

    const o = getOrders().find(x => x.id == id);
    if (!o) throw new Error('Pedido no encontrado');
    const cust = getCustomers().find(c => c.id == o.customer_id);
    const prods = getProducts();
    const items = getOrderItems().filter(i => i.order_id == id).map(item => {
      const prod = prods.find(p => p.id == item.product_id);
      return { ...item, product_name: prod ? prod.name : '—', product_category: prod ? prod.category : '', yield_unit: prod ? prod.yield_unit : '' };
    });
    const payments = getPayments().filter(p => p.order_id == id);
    return Promise.resolve({
      ...o,
      pending_balance: o.total_amount - o.total_paid,
      customer_name: cust ? cust.name : '—',
      customer_phone: cust ? cust.phone : '',
      customer_email: cust ? cust.email : '',
      customer_default_address: cust ? cust.address : '',
      items,
      payments
    });
  },

  async createOrder(data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.createOrder(data);
    if (this.activeBackend === 'local_server') return this.request('/orders', { method: 'POST', body: JSON.stringify(data) });

    const { customer_id, delivery_date, delivery_time, delivery_type, delivery_address, notes, items, initial_payment, deduct_inventory_now } = data;
    if (!customer_id || !delivery_date || !items || items.length === 0) throw new Error('Cliente, fecha y productos requeridos');

    const year = new Date().getFullYear();
    const allOrders = getOrders();
    const nextNum = (allOrders.length + 1).toString().padStart(4, '0');
    const orderNumber = `PED-${year}-${nextNum}`;

    let totalAmount = 0;
    let totalCost = 0;
    const prods = getProducts();
    const processedItems = [];

    for (const it of items) {
      const prod = prods.find(p => p.id == it.product_id);
      if (!prod) continue;
      const qty = parseFloat(it.quantity) || 1;
      const price = it.unit_price !== undefined ? parseFloat(it.unit_price) : prod.sale_price;
      const subtotal = qty * price;
      totalAmount += subtotal;
      const recipeCost = calcRecipeCost(it.product_id);
      const yieldQty = prod.yield_quantity > 0 ? prod.yield_quantity : 1;
      const unitCost = recipeCost / yieldQty;
      totalCost += (unitCost * qty);
      processedItems.push({ product_id: it.product_id, quantity: qty, unit_price: price, unit_cost: unitCost, subtotal, notes: it.notes || '' });
    }

    const newOrderId = DB.nextId('orders');
    const initialAmount = (initial_payment && parseFloat(initial_payment.amount)) || 0;
    let paymentStatus = 'PENDIENTE';
    if (initialAmount >= totalAmount) paymentStatus = 'PAGADO';
    else if (initialAmount > 0) paymentStatus = 'ABONO_PARCIAL';

    const newOrder = {
      id: newOrderId,
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
      created_at: DB.now(),
      updated_at: DB.now()
    };
    allOrders.push(newOrder);
    DB.set('orders', allOrders);

    const allItems = getOrderItems();
    let nextItemId = DB.nextId('order_items');
    for (const pi of processedItems) {
      allItems.push({ id: nextItemId++, order_id: newOrderId, ...pi });
    }
    DB.set('order_items', allItems);

    if (initialAmount > 0) {
      const pays = getPayments();
      pays.push({ id: DB.nextId('payments'), order_id: newOrderId, customer_id: Number(customer_id), amount: initialAmount, payment_method: initial_payment.payment_method || 'EFECTIVO', reference: initial_payment.reference || '', notes: 'Abono inicial', payment_date: DB.now() });
      DB.set('payments', pays);
    }

    if (deduct_inventory_now) deductLocalOrderInventory(newOrderId, orderNumber);
    return Promise.resolve(newOrder);
  },

  async updateOrderStatus(id, status) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.updateOrderStatus(id, status);
    if (this.activeBackend === 'local_server') return this.request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

    const orders = getOrders();
    const o = orders.find(x => x.id == id);
    if (!o) throw new Error('Pedido no encontrado');
    if (['EN_PREPARACION', 'LISTO', 'ENTREGADO'].includes(status) && o.inventory_deducted === 0) {
      deductLocalOrderInventory(id, o.order_number);
    }
    if (status === 'CANCELADO' && o.inventory_deducted === 1) {
      restoreLocalOrderInventory(id, o.order_number);
    }
    const freshOrders = getOrders();
    const fo = freshOrders.find(x => x.id == id);
    if (fo) { fo.status = status; fo.updated_at = DB.now(); }
    DB.set('orders', freshOrders);
    return Promise.resolve({ message: `Estado actualizado a ${status}`, order: fo });
  },

  async updateOrder(id, data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.updateOrder(id, data);
    if (this.activeBackend === 'local_server') return this.request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });

    const orders = getOrders();
    const o = orders.find(x => x.id == id);
    if (!o) throw new Error('Pedido no encontrado');
    if (data.delivery_date !== undefined) o.delivery_date = data.delivery_date;
    if (data.delivery_time !== undefined) o.delivery_time = data.delivery_time;
    if (data.delivery_type !== undefined) o.delivery_type = data.delivery_type;
    if (data.delivery_address !== undefined) o.delivery_address = data.delivery_address;
    if (data.notes !== undefined) o.notes = data.notes;
    o.updated_at = DB.now();
    DB.set('orders', orders);
    return Promise.resolve(o);
  },

  async deleteOrder(id) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.deleteOrder(id);
    if (this.activeBackend === 'local_server') return this.request(`/orders/${id}`, { method: 'DELETE' });

    const orders = getOrders();
    const o = orders.find(x => x.id == id);
    if (!o) throw new Error('Pedido no encontrado');
    if (o.inventory_deducted === 1) restoreLocalOrderInventory(id, o.order_number);
    DB.set('order_items', getOrderItems().filter(i => i.order_id != id));
    DB.set('payments', getPayments().filter(p => p.order_id != id));
    DB.set('orders', orders.filter(x => x.id != id));
    return Promise.resolve({ message: `Pedido #${o.order_number} eliminado con éxito` });
  },

  // ── Pagos ────────────────────────────────────────────────────────
  async addPayment(data) {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.addPayment(data);
    if (this.activeBackend === 'local_server') return this.request('/payments', { method: 'POST', body: JSON.stringify(data) });

    const { order_id, amount, payment_method, reference, notes } = data;
    const orders = getOrders();
    const o = orders.find(x => x.id == order_id);
    if (!o) throw new Error('Pedido no encontrado');
    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) throw new Error('Monto mayor a cero requerido');

    const pays = getPayments();
    pays.push({ id: DB.nextId('payments'), order_id: Number(order_id), customer_id: o.customer_id, amount: payAmount, payment_method: payment_method || 'EFECTIVO', reference: reference || '', notes: notes || '', payment_date: DB.now() });
    DB.set('payments', pays);

    const totalPaid = pays.filter(p => p.order_id == order_id).reduce((s, p) => s + p.amount, 0);
    o.total_paid = Math.round(totalPaid * 100) / 100;
    if (o.total_paid >= o.total_amount) o.payment_status = 'PAGADO';
    else if (o.total_paid > 0) o.payment_status = 'ABONO_PARCIAL';
    o.updated_at = DB.now();
    DB.set('orders', orders);

    const updated = await this.getOrder(order_id);
    return Promise.resolve({ message: 'Abono registrado con éxito', order: updated });
  },

  // ── Métricas y Finanzas ──────────────────────────────────────────
  async getMetrics(period = 'month') {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getMetrics(period);
    if (this.activeBackend === 'local_server') return this.request(`/metrics?period=${period}`);

    const allOrders = getOrders();
    const today = DB.today();
    const monthStart = today.substring(0, 7) + '-01';
    const weekAgo = DB.dayOffset(-7);

    const ordersFiltered = allOrders.filter(o => {
      if (o.status === 'CANCELADO') return false;
      if (period === 'today') return o.delivery_date === today;
      if (period === 'week') return o.delivery_date >= weekAgo;
      if (period === 'month') return o.delivery_date >= monthStart;
      return true;
    });

    const totalRevenue   = ordersFiltered.reduce((s, o) => s + o.total_amount, 0);
    const totalCost      = ordersFiltered.reduce((s, o) => s + o.total_cost, 0);
    const totalCollected = ordersFiltered.reduce((s, o) => s + o.total_paid, 0);
    const netProfit      = totalRevenue - totalCost;
    const profitPct      = totalRevenue > 0 ? Math.round(((netProfit / totalRevenue) * 100) * 10) / 10 : 0;
    const globalReceiv   = allOrders.filter(o => o.status !== 'CANCELADO' && o.payment_status !== 'PAGADO').reduce((s, o) => s + (o.total_amount - o.total_paid), 0);

    const dailyChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = DB.dayOffset(-i);
      const dayOrders = allOrders.filter(o => o.delivery_date === d && o.status !== 'CANCELADO');
      dailyChart.push({
        date: d,
        revenue: dayOrders.reduce((s, o) => s + o.total_amount, 0),
        cost: dayOrders.reduce((s, o) => s + o.total_cost, 0),
        profit: dayOrders.reduce((s, o) => s + (o.total_amount - o.total_cost), 0)
      });
    }

    const allIngs = getIngredients();
    const prods = getProducts();
    const productRevMap = {};
    getOrderItems().forEach(item => {
      const order = allOrders.find(o => o.id == item.order_id);
      if (!order || order.status === 'CANCELADO') return;
      const prod = prods.find(p => p.id == item.product_id);
      if (!prod) return;
      if (!productRevMap[item.product_id]) productRevMap[item.product_id] = { id: prod.id, name: prod.name, category: prod.category, units_sold: 0, total_revenue: 0, total_cost: 0, profit: 0 };
      productRevMap[item.product_id].units_sold += item.quantity;
      productRevMap[item.product_id].total_revenue += item.subtotal;
      productRevMap[item.product_id].total_cost += item.unit_cost * item.quantity;
      productRevMap[item.product_id].profit += (item.subtotal - item.unit_cost * item.quantity);
    });
    const topProducts = Object.values(productRevMap).sort((a, b) => b.units_sold - a.units_sold).slice(0, 5);

    return Promise.resolve({
      period,
      summary: {
        total_orders: ordersFiltered.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        profit_margin_pct: profitPct,
        total_collected: Math.round(totalCollected * 100) / 100,
        period_receivables: Math.round((totalRevenue - totalCollected) * 100) / 100,
        global_receivables: Math.round(globalReceiv * 100) / 100
      },
      inventory: {
        total_ingredients: allIngs.length,
        low_stock_count: allIngs.filter(i => i.current_stock <= i.min_stock).length,
        total_inventory_value: Math.round(allIngs.reduce((s, i) => s + i.current_stock * i.cost_per_unit, 0) * 100) / 100
      },
      top_products: topProducts,
      daily_chart: dailyChart
    });
  },

  async getSettings() {
    await this.ensureBackend();
    if (this.activeBackend === 'firebase') return FirebaseService.getSettings();
    if (this.activeBackend === 'local_server') return this.request('/settings');
    return Promise.resolve(getLocalSettings());
  },

  async ensureBackend() {
    if (this.activeBackend === 'detecting') {
      await this.detectBackend();
    }
  }
};

// Autodetectar backend al cargar script
API.detectBackend();
