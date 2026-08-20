import { prisma } from "../../lib/prisma"

export const businessService = {

    async getBusinessList() {
        try {
            const result = await prisma.business.findMany();
            return result
        } catch (error) {
            throw new Error(" Faild to get Business list ")
        }

    }


}