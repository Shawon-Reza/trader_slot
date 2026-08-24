import { app } from "./lib/app";
import { prisma } from "./lib/prisma";


const main = async () => {
    try {
        const PORT = Number(process.env.PORT) || 5000;
        await prisma.$connect();
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });

    } catch (error) {
        console.error("Error starting the server:", error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();