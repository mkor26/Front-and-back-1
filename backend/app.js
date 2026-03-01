const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

// Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

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

// --- Swagger configuration ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API управления товарами',
            version: '1.0.0',
            description: 'API для интернет-магазина с товарами',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Локальный сервер',
            },
        ],
    },
    apis: ['./app.js'], // указываем, где искать JSDoc комментарии
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- База данных ---
let products = [
    { id: nanoid(6), name: 'Ноутбук ASUS', category: 'Электроника', description: '8GB RAM, 512GB SSD', price: 75000, stock: 5 },
    { id: nanoid(6), name: 'Мышь Logitech', category: 'Аксессуары', description: 'Беспроводная, 1600 DPI', price: 2500, stock: 15 },
    { id: nanoid(6), name: 'Клавиатура Aula F75', category: 'Аксессуары', description: 'Механическая, RGB подсветка', price: 4500, stock: 8 },
    { id: nanoid(6), name: 'Монитор Samsung', category: 'Электроника', description: '4K, IPS', price: 32000, stock: 3 },
    { id: nanoid(6), name: 'Наушники Sony', category: 'Аудио', description: 'Беспроводные, шумоподавление', price: 15000, stock: 7 },
    { id: nanoid(6), name: 'Внешний диск 1TB', category: 'Хранение', description: 'USB, внешний HDD', price: 5500, stock: 12 },
    { id: nanoid(6), name: 'Флешка 64GB', category: 'Хранение', description: 'USB, металлический корпус', price: 1200, stock: 25 },
    { id: nanoid(6), name: 'Принтер HP', category: 'Периферия', description: 'Лазерный, ч/б', price: 18000, stock: 2 },
    { id: nanoid(6), name: 'Веб-камера Logitech', category: 'Аксессуары', description: '1080p, 60 фпс', price: 6500, stock: 4 },
    { id: nanoid(6), name: 'Микрофон Fifine', category: 'Аудио', description: 'USB, динамический', price: 12000, stock: 3 }
];

function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return null;
    }
    return product;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: Автоматически сгенерированный уникальный ID товара
 *         name:
 *           type: string
 *           description: Название товара
 *         category:
 *           type: string
 *           description: Категория товара
 *         description:
 *           type: string
 *           description: Описание товара
 *         price:
 *           type: number
 *           description: Цена товара в рублях
 *         stock:
 *           type: integer
 *           description: Количество товара на складе
 *       example:
 *         id: "abc123"
 *         name: "Ноутбук ASUS"
 *         category: "Электроника"
 *         description: "15.6\", 8GB RAM, 512GB SSD"
 *         price: 75000
 *         stock: 5
 */

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Управление товарами
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создает новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка валидации (не все поля заполнены)
 */
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

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Возвращает список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
    res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получает товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;
    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновляет данные товара
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Обновленный товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Нет данных для обновления
 *       404:
 *         description: Товар не найден
 */
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

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удаляет товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар успешно удален (нет тела ответа)
 *       404:
 *         description: Товар не найден
 */
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
    console.log(`Swagger документация: http://localhost:${port}/api-docs`);
});