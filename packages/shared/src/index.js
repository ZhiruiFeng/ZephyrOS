"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateTime = exports.formatDate = exports.TABLES = void 0;
// 数据库表名
exports.TABLES = {
    TASKS: 'tasks',
    MEMORIES: 'memories',
    TAGS: 'tags'
};
// 通用工具函数
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN');
};
exports.formatDate = formatDate;
const formatDateTime = (date) => {
    return new Date(date).toLocaleString('zh-CN');
};
exports.formatDateTime = formatDateTime;
