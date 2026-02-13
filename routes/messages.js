const express = require('express');
const axios = require('axios');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/:chatId', authenticateToken, async (req, res) => {
    try {
        const messages = await Message.find({ chatId: req.params.chatId }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:chatId', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const userMessage = new Message({ chatId: req.params.chatId, sender: 'user', content: content });
        await userMessage.save();

        const aiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: content }]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });

        const aiContent = aiResponse.data.choices[0].message.content;
        const aiMessage = new Message({ chatId: req.params.chatId, sender: 'ai', content: aiContent });
        await aiMessage.save();

        await Chat.findByIdAndUpdate(req.params.chatId, { updatedAt: new Date() });
        res.json({ userMessage, aiMessage });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;