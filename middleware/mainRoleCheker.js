const checkRole = (requiredRole) => {
    return (req, res, next) => {
        const {roles} = req.user;
        const roleHierarchy = {
            customer: 1,
            seller: 2,
            admin: 3,
        };
        if (roleHierarchy[roles] >= roleHierarchy[requiredRole]) {
            next(); // User has the required role
        } else {
            return res.status(403).json({message: "Access Denied"});
        }
    };
};
