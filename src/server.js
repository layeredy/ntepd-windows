const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { existsSync, mkdirSync } = require('fs');

function createServer(notesDir) {
    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'static')));

    if (!existsSync(notesDir)) {
        mkdirSync(notesDir, { recursive: true });
    }

    async function getNextId() {
        try {
            const files = await fs.readdir(notesDir);
            const ids = files
                .filter(f => f.endsWith('.json'))
                .map(f => parseInt(f.split('.')[0]))
                .filter(id => !isNaN(id));
            return Math.max(0, ...ids) + 1;
        } catch (err) {
            console.error('Error getting next ID:', err);
            return 1;
        }
    }

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'static/index.html'));
    });

    app.get('/api/notes', async (req, res) => {
        try {
            const files = await fs.readdir(notesDir);
            const notes = await Promise.all(
                files
                    .filter(f => f.endsWith('.json'))
                    .map(async (filename) => {
                        const content = await fs.readFile(
                            path.join(notesDir, filename),
                            'utf-8'
                        );
                        return JSON.parse(content);
                    })
            );
            notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            res.json(notes);
        } catch (err) {
            console.error('Error getting notes:', err);
            res.status(500).json({ error: 'Failed to get notes' });
        }
    });

    app.post('/api/notes', async (req, res) => {
        try {
            const { title, content } = req.body;
            const noteId = await getNextId();
            const note = {
                id: noteId,
                title,
                content,
                created_at: new Date().toISOString()
            };

            await fs.writeFile(
                path.join(notesDir, `${noteId}.json`),
                JSON.stringify(note),
                'utf-8'
            );
            res.json(note);
        } catch (err) {
            console.error('Error creating note:', err);
            res.status(500).json({ error: 'Failed to create note' });
        }
    });

    app.put('/api/notes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const filepath = path.join(notesDir, `${id}.json`);
            
            if (!existsSync(filepath)) {
                return res.status(404).send();
            }

            const noteContent = await fs.readFile(filepath, 'utf-8');
            const note = JSON.parse(noteContent);
            
            const { title, content } = req.body;
            note.title = title;
            note.content = content;

            await fs.writeFile(filepath, JSON.stringify(note), 'utf-8');
            res.json(note);
        } catch (err) {
            console.error('Error updating note:', err);
            res.status(500).json({ error: 'Failed to update note' });
        }
    });

    app.delete('/api/notes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const filepath = path.join(notesDir, `${id}.json`);
            
            if (existsSync(filepath)) {
                await fs.unlink(filepath);
            }
            res.status(204).send();
        } catch (err) {
            console.error('Error deleting note:', err);
            res.status(500).json({ error: 'Failed to delete note' });
        }
    });

    return app;
}

module.exports = createServer;