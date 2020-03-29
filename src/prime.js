const BigNumber = require('bignumber.js')

const p = BigNumber("167")
const q = BigNumber("83")
const g = BigNumber("48")

const bankPriKey = BigNumber("57")
const bankPubKey = BigNumber("132")

// const p = BigNumber("11")
// const q = BigNumber("5")
// const g = BigNumber("9")

// const bankPriKey = BigNumber("4")
// const bankPubKey = BigNumber("5")

const schnorrGroupSetting = {
    p, q, g
}

const bankSetting = {
    priKey : bankPriKey, 
    pubKey : bankPubKey
}

const hashq = (c, G, M) => {
    c = BigNumber(c)
    G = BigNumber(G)
    M = BigNumber(M)

    let sum = c.plus(G).plus(M)
    return schnorrGroupSetting.g.pow(sum).modulo(schnorrGroupSetting.q)
}

const hashMessage = (m) => {
    return schnorrGroupSetting.g.pow(m).modulo(schnorrGroupSetting.p)
}

const getRandomNumber = (min, max) => {
    min = BigNumber(min)
    max = BigNumber(max)
    let range = max.minus(min).plus(BigNumber(1))
    return min.plus(BigNumber.random().times(range)).dp(0, BigNumber.ROUND_DOWN)
}

const signature = (m, userPriKey) => {
    let s = m.pow(userPriKey).modulo(p)
    return s
}

const generateDVS = (userPriKey, bankPubKey, message, callback) => {
    let start = new Date()
    let summary = {}
    let buffer = new Buffer(message)
    Buffer.prototype.toByteArray = function () {
        return Array.prototype.slice.call(this, 0)
    }
    let DVS = []
    let i = 0
    let arr = buffer.toByteArray()
    summary['length'] = arr.length
    for(let byte of arr){
        i ++
        if(callback){
            callback(i,arr.length)
        }
        // console.log(`Generating signature complete ${(i/arr.length) * 100}% `)
        byte = BigNumber(byte)
        byte = hashMessage(byte)
        
        let s = signature(byte, userPriKey)
        let P = generateDVP(userPriKey, bankPubKey, byte)

        let S = {m : byte.toString(), s : s.toString(), P}
        DVS.push(S)
    }
    summary['time'] = new Date().getTime() - start.getTime()
    return {DVS, summary}
}

const verifyDVS = (userPubKey, bankPubKey, DVS) => {
    for(let split of DVS){
        let m = BigNumber(split.m)
        let s = BigNumber(split.s)
        let P = split.P

        let success = verifyDVP(userPubKey, bankPubKey, m, s, P)
        if(!success){
            return false
        }
    }
    return true
}

const generateDVP = (userPriKey, bankPubKey, m) => {
    let {p, q, g} = schnorrGroupSetting
    let w = getRandomNumber(2, q)
    let r = getRandomNumber(2, q)
    let t = getRandomNumber(2, q)

    // let w = BigNumber('3')
    // let r = BigNumber('3')
    // let t = BigNumber('3')

    let c = ((g.pow(w)).times((bankPubKey.pow(r)))).modulo(p)
    let G = (g.pow(t)).modulo(p)
    let M = (m.pow(t)).modulo(p)
    let h = hashq(c, G, M)
    let d = t.plus(userPriKey.times(h.plus(w)).modulo(q))

    return {
        w : w.toString(), 
        r : r.toString(), 
        G : G.toString(), 
        M : M.toString(), 
        d : d.toString()
    }
}

const verifyDVP = (userPubKey, bankPubKey, m, s, P) => {
    let {p, q, g} = schnorrGroupSetting
    let {w, r, G, M, d} = P

    w = BigNumber(w)
    r = BigNumber(r)
    G = BigNumber(G)
    M = BigNumber(M)
    d = BigNumber(d)

    userPubKey = BigNumber(userPubKey)
    bankPubKey = BigNumber(bankPubKey)

    let c = (g.pow(w).times(bankPubKey.pow(r))).modulo(p) 
    let h = hashq(c, G, M)

    let lhs_1 = (G.times(userPubKey.pow(h.plus(w)))).modulo(p)
    let rhs_1 = (g.pow(d)).modulo(p) 

    let lhs_2 = (M.times(s.pow(h.plus(w)))).modulo(p)
    let rhs_2 = (m.pow(d)).modulo(p)
    
    return lhs_1.toString() === rhs_1.toString() && lhs_2.toString() === rhs_2.toString()
}


module.exports = {
    schnorrGroupSetting, 
    bankSetting,
    getRandomNumber,
    generateDVP,
    verifyDVP,
    hashMessage,
    signature,
    generateDVS,
    verifyDVS
}
