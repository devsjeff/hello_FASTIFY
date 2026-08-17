import Fastify from "fastify"

const fastify = Fastify()

fastify.get("/homies:id",async(request:any , reply:any)=>  {
    console.log("ID is ==============", request.params.id)
    return"hii"

});
await fastify.listen({port : 3000})
console.log("started")