const { VerifyToken } = require("@kartikgangil/watchman_js");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ success: false, message: "Token not provided" });
    }

    const token = authHeader.split(" ")[1]; // "Bearer <token>"

    const decoded = await VerifyToken(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
};

module.exports = authMiddleware;