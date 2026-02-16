function postValidation(req, res, next) {
    const { title, image, description, content, category_id, status_id } = req.body;
    if(!title) {
        return res.status(400).json({ message: "Title is required" });
    }
    if(!image) {
        return res.status(400).json({ message: "Image is required" });
    }
    if(!description) {
        return res.status(400).json({ message: "Description is required" });
    }
    if(!content) {
        return res.status(400).json({ message: "Content is required" });
    }
    if(!category_id) {
        return res.status(400).json({ message: "Category is required" });
    }
    if(!status_id) {
        return res.status(400).json({ message: "Status is required" });
    }

    if(typeof title !== "string") {
        return res.status(400).json({ message: "Title must be a string" });
    }
    if(typeof image !== "string") {
        return res.status(400).json({ message: "Image must be a string URL" });
    }
    if(typeof description !== "string") {
        return res.status(400).json({ message: "Description must be a string" });
    }
    if(typeof content !== "string") {
        return res.status(400).json({ message: "Content must be a string" });
    }
    if(typeof category_id !== "number") {
        return res.status(400).json({ message: "Category must be a number" });
    }
    if(typeof status_id !== "number") {
        return res.status(400).json({ message: "Status must be a number" });
    }
    next();
}

export default postValidation;

