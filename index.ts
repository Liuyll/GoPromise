interface Judge {
    ():boolean
}

interface HandleError {
    (err:Error): void
}
interface PromiseControlBlock {
    timeout:number,
    resolve:Function,
    condition ?: Judge | Judge[],
    isUntil ?: boolean
}

interface GoPromise {
    promiseControlMap:Map<string,PromiseControlBlock>,
    promiseControlOrder:Array<string>,
    Base:Promise<any>,
    lastPromise:Promise<any>,
    unHandleError:HandleError
}

function simpleHandleError(err:Error){
    console.log(err.stack)
}
class GoPromise{
    constructor(){
        let _resolve:Function  
        this.Base = new Promise((resolve) => {
            _resolve = resolve
        })
        .catch((err) => {
            console.error(err)
        })

        this.lastPromise = this.Base

        this.promiseControlMap = new Map()
        this.promiseControlOrder = ['base']

        this.promiseControlMap.set('base',{
            timeout:0,
            resolve:_resolve
        })

        this.unHandleError = simpleHandleError
    }

    next = (key,cb,timeout,reject?:HandleError) => {
        if(this.promiseControlMap.get(key)){
            throw new Error('key has been registered')
        }
        else {
            if(timeout){
                let key = this.promiseControlOrder[this.promiseControlOrder.length - 1]
                let previousPromise = this.promiseControlMap.get(key)
                previousPromise.timeout += timeout
            }

            let _resolve
            let tempPromise = new Promise((resolve) => {
                _resolve = resolve
            }).catch((err:Error) => {
                if(reject) reject(err)
                else this.unHandleError(err)
            })
           
            this.lastPromise.then((resolve) => {
                cb()
                return this.lastPromise
            })

            this.lastPromise = tempPromise

            this.promiseControlMap.set(key,this.generatorPCB(_resolve))
            this.promiseControlOrder.push(key)
        }
        return this
    }

    run = (index = 0) => {
        let key = this.promiseControlOrder[index]
        let startPCB = this.promiseControlMap.get(key)
        let conditions = startPCB.condition
        let isUntil = startPCB.isUntil
        let untilTimer
        let lastTime

        if(conditions){
            let result = conditionCheck(conditions)
            if(result){
                timeExec()
            }
            else {
                if(isUntil){
                    untilTimer = Date.now()
                }

                conditionWait(conditions,timeExec)
            }
        }
        else {
            timeExec()
        }
        
        let ctx = this

        function timeExec(){
            setTimeout(() => {
                startPCB.resolve()
                if(index < ctx.promiseControlOrder.length - 1){
                    ctx.run(index+1)
                }
            },lastTime ? startPCB.timeout - lastTime > 0  ? startPCB.timeout - lastTime : 0 : startPCB.timeout)
        }

        function conditionCheck(conditions){
            if(Array.isArray(conditions)){
                return conditions.every((condition) => condition())
            }
            else {
                return conditions()
            }
        }

        function conditionWait(conditions,cb){
            setTimeout(() => {
                if(conditionCheck(conditions)){
                    if(untilTimer){
                        lastTime = Date.now() - untilTimer
                    }

                    cb()
                }
                else {
                    conditionWait(conditions,cb)
                }
            },0)
        }
    }

    until = (condition:Judge) => {
        let curPCB = this.findFootPromise()
        this.addCondition(curPCB,condition,true)

        return this
    }

    condition = (condition:Judge) => {
        let curPCB = this.findFootPromise()
        this.addCondition(curPCB,condition,false)

        return this
    }
    
    addCondition = (curPCB:PromiseControlBlock,condition:Judge,isUntil:boolean) => {
        if(curPCB.condition){
            if(Array.isArray(curPCB.condition)){
                curPCB.condition.push(condition)
            }
            else {
                curPCB.condition = [<Judge>curPCB.condition,condition]
            }
        }
        else curPCB.condition = condition

        if(isUntil){
            if(!curPCB.isUntil){
                curPCB.isUntil = true
            }
        }
    }

    findFootPromise(){
        let key = this.promiseControlOrder[this.promiseControlOrder.length - 1]
        let targetPCB = this.promiseControlMap.get(key)
        return targetPCB
    }

    generatorPCB(resolve):PromiseControlBlock{
        return {
            resolve,
            timeout:0
        }
    }

}

