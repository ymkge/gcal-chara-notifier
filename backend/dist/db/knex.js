"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const config = require("../knexfile");
const environment = process.env.NODE_ENV || 'development';
// Cast to any to bypass the type error
const dbConfig = config[environment];
if (!dbConfig) {
    throw new Error(`Database configuration for environment '${environment}' not found.`);
}
const db = (0, knex_1.default)(dbConfig);
exports.default = db;
//# sourceMappingURL=knex.js.map