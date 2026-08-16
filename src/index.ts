import { app } from "./lib/app";
import { prisma } from "./lib/prisma";


const main = async () => {
    try {
        await prisma.$connect();
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });

    } catch (error) {
        console.error("Error starting the server:", error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();