const express = require('express');
const cors = require('cors');
const { config } = require('dotenv');
config()
const prisma = require('./lib/prisma.js');
const AiProcessor = require("./Agent.js")
const { GenToken, comparePassword, hashPassword } = require('@kartikgangil/watchman_js');
const app = express();
app.use(express.json());
app.use(cors({
    origin: "*"
}));
const classified = ["SALES", "BILLING", "TECHNICAL", "GENERAL"]

const PORT = process.env.PORT || 8000;

const priorityMap = {
    "low": 0,
    "medium": 1,
    "high": 2
}

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = await GenToken(
            { id: user.id, email: user.email },
            { expiresIn: "7d" },
            process.env.JWT_SECRET
        );

        return res.status(200).json({ success: true, token, user: { id: user.id, name: user.name, email } });
    } catch (error) {
        console.error(error)
        res.status(400).json({ message: "something went wronge" })
    }
})

app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })
        if (user) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await hashPassword(password);
        const new_user = await prisma.user.create({
            data: {
                name, email, password: hashedPassword
            }
        });

        const token = await GenToken(
            { id: new_user.id, email: new_user.email },
            { expiresIn: "7d" },
            process.env.JWT_SECRET
        );

        return res.status(201).json({ success: true, token, user: { id: new_user.id, name, email } });
    } catch (error) {
        console.error(error)
        res.status(400).json({ message: "something went wronge" })
    }
})

app.post("/request", async (req, res) => {
    try {
        const data = req.body;
        // console.log(data)
        if (!data.name || !data.message || !data.email) {
            return res.status(422).json({ message: "missing fields" })
        }
        const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
        const duplicate = await prisma.request.findFirst({
            where: {
                name: data.name,
                email: data.email,
                message: data.message,
                created_at: { gte: sixtySecondsAgo }
            }
        })
        if (duplicate && priorityMap[duplicate.priority.toLowerCase()] < priorityMap[data.priority.toLowerCase()] ) {
            console.log("duplicate hit")
            await prisma.request.update({
                where: {
                    id: duplicate.id
                },
                data: {
                    priority: data.priority
                }
            });
            return res.status(200).json({ message: "data saved successfully" })
        }

        const request = await prisma.request.create({
            data: {
                name: data.name,
                email: data.email,
                message: data.message,
                priority: data.priority,
                classified_as: ("General").toUpperCase(),
                classification_source: "AI",
                status: "PENDING"
            }
        })
        if (request) {
            ProcessMessage(request);
            return res.status(200).json({ message: "data saved successfully" })
        } else {
            return res.status(400).json({ message: "something went wronge" })
        }
    } catch (error) {
        console.error(error)
        return res.status(400).json({ message: "something went wronge" })
    }
})

app.get("/request", async (req, res) => {
    try {
        const data = await prisma.request.findMany();
        return res.status(200).json(data)
    } catch (error) {
        console.error(error)
        res.status(400).json({ message: "something went wronge" })
    }
})


// classify the request on the basis of message

async function ProcessMessage(request) {
    try {
        const id = request.id;
        let answer = await AiProcessor(request.message);

        if (!classified.includes(answer)) {
            answer = "GENERAL"
        }
        await prisma.request.update({
            where: {
                id
            },
            data: {
                classified_as: answer
            }
        });
    } catch (error) {
        console.error(error)
    }
}


app.listen(PORT, () => {
    console.log("server is running on " + PORT)
})