
import { prisma } from "../../lib/prisma"
import { error } from "node:console";


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
    },
    async createProfile({
        businessId,
        userId,
    }: {
        businessId: number;
        userId: string;
    }) {

        try {
            console.log(businessId, userId)
            const businessid = businessId.toString()




            const traderProfile = await prisma.trader.findUnique({
                where: {
                    userId
                }
            })
            console.log("aaaaaaaaaaaaaaaaaa", traderProfile)

            if (traderProfile) {
                return null
            }

            const result = await prisma.trader.create({
                data: {
                    userId,
                    businessId: businessid
                }
            })
            return result


        } catch (error) {
            throw new Error("Failed to Create Trader Profile");
        }
    }

}