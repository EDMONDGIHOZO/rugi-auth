"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const library_1 = require("@prisma/client/runtime/library");
exports.default = (0, library_1.defineDatasource)({
    adapter: {
        provider: 'postgresql',
        url: process.env.DATABASE_URL,
    },
});
//# sourceMappingURL=config.js.map