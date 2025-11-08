"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const knex_1 = __importDefault(require("./db/knex"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use(express_1.default.json());
// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        await knex_1.default.raw('SELECT 1');
        res.status(200).send({ status: 'ok', db: 'connected' });
    }
    catch (e) {
        const error = e;
        console.error('Health check failed:', error.message);
        res.status(500).send({ status: 'error', db: 'disconnected', error: error.message });
    }
});
// A simple root endpoint
app.get('/', (req, res) => {
    res.send('GCal Chara Notifier Backend is running!');
});
app.listen(port, () => {
    console.log(`Backend server is running at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map