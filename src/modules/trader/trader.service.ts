import { prisma } from "../../lib/prisma"


export const traderServices = {

    async getTraderexistance(userId: any) {

        try {
            const userExistance = await prisma.trader.findUnique({
                where: {
                    userId: userId
                }
            })
            return userExistance
        } catch (error) {
            throw new Error("Failed to find trader");
        }

    }

}