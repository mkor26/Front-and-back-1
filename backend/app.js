const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const port = 3000;

app.use(cors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            console.log('Body:', req.body);
        }
    });
    next();
});

let products = [
    { id: nanoid(6), name: 'Ноутбук ASUS', category: 'Электроника', description: '8GB RAM, 512GB SSD', price: 75000, stock: 5 },
    { id: nanoid(6), name: 'Мышь Logitech', category: 'Аксессуары', description: 'Беспроводная, 1600 DPI', price: 2500, stock: 15 },
    { id: nanoid(6), name: 'Клавиатура AULA F75', category: 'Аксессуары', description: 'Механическая, RGB подсветка', price: 4500, stock: 8 },
    { id: nanoid(6), name: 'Монитор Samsung', category: 'Электроника', description: '4K, IPS', price: 32000, stock: 3 },
    { id: nanoid(6), name: 'Наушники Sony', category: 'Аудио', description: 'Беспроводные, шумоподавление', price: 15000, stock: 7 },
    { id: nanoid(6), name: 'Внешний диск 1TB', category: 'Хранение', description: 'USB, внешний HDD', price: 5500, stock: 12 },
    { id: nanoid(6), name: 'Флешка 64GB', category: 'Хранение', description: 'USB, металлический корпус', price: 1200, stock: 25 },
    { id: nanoid(6), name: 'Принтер HP', category: 'Периферия', description: 'Лазерный, ч/б', price: 18000, stock: 2 },
    { id: nanoid(6), name: 'Веб-камера Logitech', category: 'Аксессуары', description: '1080p, 60фпс', price: 6500, stock: 4 },
    { id: nanoid(6), name: 'Микрофон Fifine', category: 'Аудио', description: 'USB, динамический', price: 4000, stock: 3 }
];

function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return null;
    }
    return product;
}

app.get('/api/products', (req, res) => {
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;
    res.json(product);
});

app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock } = req.body;
    if (!name || !category || !description || price === undefined || stock === undefined) {
        return res.status(400).json({ error: "Все поля обязательны" });
    }
    const newProduct = {
        id: nanoid(6),
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        price: Number(price),
        stock: Number(stock)
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.patch('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;
    const { name, category, description, price, stock } = req.body;
    if (name === undefined && category === undefined && description === undefined && price === undefined && stock === undefined) {
        return res.status(400).json({ error: "Нет данных для обновления" });
    }
    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const exists = products.some(p => p.id === id);
    if (!exists) {
        return res.status(404).json({ error: "Product not found" });
    }
    products = products.filter(p => p.id !== id);
    res.status(204).send();
});

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
