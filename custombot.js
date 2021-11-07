const rp = require('request-promise')
const ranUA = require('random-useragent')
const $ = require('cheerio')
const discord = require('webhook-discord')
const fs = require('fs')





class Start {
    constructor(url, webhook) {
        this.proxy = proxy
        this.url = url
        this.UA = ranUA.getRandom(ua => {
            return ua.browserName == "Chrome"
        })
        this.theyHook = webhook
        this.profile = profile
        this.hook = new discord.Webhook(this.myHook)

    }
	
    //creates and manage files
    fileManager(data, mode) {
        let handler
        if (!fs.existsSync('./instockFiles.JSON')) {
            console.log('No File Exist....Creating File')
            let x = []
            handler = JSON.stringify(x, null, 2)
            fs.writeFileSync('./instockFiles.JSON', handler, 'utf-8')
        }
        switch (mode) {
            case 'save':
                handler = JSON.stringify(data)
                fs.writeFileSync('./instockFiles.JSON', handler, 'utf-8')
                console.log('Data Saved')


            case 'load':
                console.log('Loading Files')
                try {
                    let x = fs.readFileSync('./instockFiles.JSON', "utf-8")
                    handler = JSON.parse(x)
                    return handler

                } catch (err) {
                    console.log(err)
                }

            case 'delete all':
                console.time('delete')
                console.log('Deleting FIles')
                let x = []
                handler = JSON.stringify(x)
                fs.writeFileSync('./instockFiles.JSON', handler, 'utf-8')
                console.timeEnd('delete')
                console.log('Completed')


        }
    }
	//send HTTP REQUEST TO WEBSITE
    async productFinder() {
        let handler;
        let list = []
        let outOfStockList = []
        console.time('Scraped in')
        if (this.url) {
            console.log('Retrieving Product Data')
            
            let geturi = await rp.get(this.url, {
                headers: { 'user-agent': this.UA,'cachr-control':'private' },
                resolveWithFullResponse: true,
                json: true,
                //proxy: this.randomProxy(this.proxy)

            })
//PARSE DATA RECIEVED WITH CHEERIO
            let data = $.load(geturi.body)
            //let test = data('[class="variations_from cart"]').html()
            //console.log(test)
            try {
                let sku = data('[class="variations_form cart"]').get()[0].attribs['data-product_id']
                let fittedData = data('[class="variations_form cart"]').get()[0].attribs['data-product_variations']
                let prodName = data('[class="product_title entry-title"]').html()
                let parsedfData = JSON.parse(fittedData)
                for (let o = 0; o < parsedfData.length; o++) {
                    if (parsedfData[o].is_in_stock == true) {
                        let data = {
                            url: this.url,
                            img: parsedfData[o].image.url,
                            name: prodName,
                            size: parsedfData[o].attributes.attribute_size,
                            color: parsedfData[o].attributes.attribute_color,
                            stock: parsedfData[o].max_qty,
                            price: parsedfData[o].display_price,
                            atc: encodeURI(this.url + "?attribute_size=" + parsedfData[o].attributes.attribute_size + "&attribute_color=" + parsedfData[o].attributes.attribute_color + "&quantity=1&add-to-cart=" + sku + "&product_id=" + sku + "&variation_id=" + parsedfData[o].variation_id)

                        }
                        list.push(data)
                    }else{
                        outOfStockList.push(parsedfData)
                    }
                }
                //console.log(list) 
            } catch (err) {
                let snapData = data('[type="application/ld+json"]')
                let parsedsData = JSON.parse(snapData.html())
                if (parsedsData) {
                    let xhandler = {
                        name: parsedsData.name,
                        img: parsedsData.image,
                        price: parsedsData.offers[0].price,
                        productSku: parsedsData.sku,
                        stock: parsedsData.offers[0].availability.slice(18,),
                        atc: encodeURI(parsedsData.url + "?quantity=1&add-to-cart=" + parsedsData.sku)
                    }
                    //console.log(handler)
                    list.push(xhandler)
                    //console.log(xhandler)
                } else {
                    outOfStockList.push(parsedsData)
                }
            }
            fs.writeFileSync('./outOfStockFiles.JSON',JSON.stringify(outOfStockList),'utf-8')
            return list

        } else {
            console.log('Searching For New Products')
            let getAllLinks = await rp.get('https://www.shopcapcity.com/product-category/exclusive-drops/?orderby=date', {
                headers: { 'user-agent': this.UA, 'cache-control': 'private' },
                resolveWithFullResponse: true,
                json: true,
            })

            let linklist = []
            let rawData = $.load(getAllLinks.body)
            rawData('[class="ast-loop-product__link"]').each((index, element) => {
                linklist.push(element.attribs['href'])
            })
            //console.log(linklist.length)
            for (let u = 0; u < linklist.length -1; u++) {
                let getlink = await rp.get(linklist[u], {
                    headers: { 'user-agent': this.UA, 'cache-control':"private" },
                    resolveWithFullResponse: true,
                    json: true,
                    //proxy: this.randomProxy(this.proxy)

                })

                let data = $.load(getlink.body)
                //console.log(data.html())
                
                try {
                    let fittedData = data('[class="variations_form cart"]').get()[0].attribs['data-product_variations']
                    let prodName = data('[class="screen-reader-text"]').text().replace('quantity','')
                    let parsedfData = JSON.parse(fittedData)
					//console.log(prodName)
                    let sku = data('[class="variations_form cart"]').get()[0].attribs['data-product_id']
                    for (let o = 0; o < parsedfData.length; o++) {
                        if (parsedfData[o].is_in_stock == true) {
                            let data = {
                                url: linklist[u],
                                img: parsedfData[o].image.url,
                                name: prodName,
                                size: parsedfData[o].attributes.attribute_size,
                                color: parsedfData[o].attributes.attribute_color,
                                stock: parsedfData[o].max_qty,
                                price: parsedfData[o].display_price,
                                atc: encodeURI(linklist[u] + "?attribute_size=" + parsedfData[o].attributes.attribute_size + "&attribute_color=" + parsedfData[o].attributes.attribute_color + "&quantity=1&add-to-cart=" + sku + "&product_id=" + sku + "&variation_id=" + parsedfData[o].variation_id)
                            }
                            list.push(data)

                        }else{
                            outOfStockList.push(parsedfData)
                        }
                    }
                } catch (err) {
                    try {
                        let snapData = data('[type="application/ld+json"]')
                        //console.log(snapData.html())
                        let parsedsData = JSON.parse(snapData.html())
                        //console.log(parsedsData)
                        if (parsedsData) {
                            handler = {
                                name: parsedsData.name,
                                img: parsedsData.image,
                                price: parsedsData.offers[0].price,
                                sku: parsedsData.sku,
                                stock: parsedsData.offers[0].availability.slice(18,),
                                atc: encodeURI(parsedsData.url + "?quantity=1&add-to-cart=" + parsedsData.sku)
                            }
                            //console.log(handler)
                            list.push(handler)
                        }else{
                            outOfStockList.push(parsedsData)
                        }
                    } catch (errr) {
                        console.log(errr)
                    }
                }
            }
            let newOos = this.productFilter(outOfStockList,'oos')
            fs.writeFileSync('./outOfStockFiles.JSON',JSON.stringify(newOos),'utf-8')
            //console.log(list)
            return list
        }
    }
	//FILTER NEWLY SCRAPED DATA FROM 
//AND FLITERS FOR NEW PRODUCTS BY COMPARING IT WITH 
//WITH PAST SCRAPED DATA
    async productFilter(elements) {
        let filteredItems;
        try {
            let items;
            items = fs.readFileSync('./instockFiles.JSON')
            let parsed = JSON.parse(items)
            filteredItems = elements.filter(ele => {
                let stringed = JSON.stringify(ele.atc)
                let xlist = []
                for (let i = 0; i < parsed.length - 1; i++) {
                    let x = JSON.stringify(parsed[i].atc)
                    xlist.push(x)
                }
                if (xlist.includes(stringed) == false) {
                    //console.log("yes")
                    return ele

                } else {
                    //console.log("No")
                }

            })
            return filteredItems
        
        } catch (err) {
            console.log(err)
        }

    }
	//discord web hook
    async monitorMode(products) {
        let hooklist = []
        let msg;
        let filteredProds;
        let savedFiles = this.fileManager('', "load")
        
        if (savedFiles.length == 0) {

            filteredProds = products

        }else{

            filteredProds = await this.productFilter(products,'instock')
        }
    	//console.log(filteredProds)
        //console.log(filteredProds.length)
        if (filteredProds.length - 1 > 0) {
            for (let i = 0; i < filteredProds.length; i++) {
                try {
                    msg = new discord.MessageBuilder()
                        .setName('ShopCapCityMonitor')
                        .setThumbnail(filteredProds[i].img)
                        .addField('Name', JSON.stringify(filteredProds[i].name).replace(/["]+/g, ''))
                        .addField('Color', JSON.stringify(filteredProds[i].color ? filteredProds[i].color : "Null").replace(/["]+/g, ''), true)
                        .addField('Price', JSON.stringify(filteredProds[i].price), true)
                        .addField('Size', JSON.stringify(filteredProds[i].size ? filteredProds[i].size : "Null").replace(/["]+/g, ''), true)
                        .addField('Available Stock', JSON.stringify(filteredProds[i].stock).replace(/["]+/g, ''), true)
                        .setTitle('Add To Cart')
                        .setTime()
                        .setURL(filteredProds[i].atc)

                    hooklist.push(msg)
                    //console.log(msg.getJSON())
                } catch (err) {
                    console.log(err.message)
                }

            }

        } else {
            console.log("Nothing Detected")
        }

        if (hooklist.length-1 > 0) {
            for (let i = 0; i < hooklist.length; i++) {
                if (hooklist[i] != null) {
                    console.log(`sending webhook #${i} out of ${hooklist.length-1}`)
                    setTimeout(async () => await this.hook.send(hooklist[i]), 5000)

                }
                savedFiles.unshift(filteredProds[i])


            }

            this.fileManager(savedFiles, 'save')
            console.log('webhooks sent')
            console.timeEnd('Scraped in')
            console.log('===========')
            return true

        } else {
            console.log('No webhook sent')
            console.timeEnd('Scraped in')
            console.log('===========')
            return false
        }
    }
    
}
//let url = 'https://www.shopcapcity.com/product/lakers-x-dodgers-new-era-9fifty-exclusive-black-snapback/'
let profile = { fname: "", lname: "", email: "", phoneNum: "", address: '', city: '', state: "", zipCode: "", cardNum: "", cardExp: "", cvc: "", cardType: "" }
let task = new Start()
function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
async function start() {
    await task.productFinder()
    .then(async products =>{
		await task.monitorMode(products)
        .then(async  () =>{
            await sleep(120000)
            .then(()=>{
                start()
            })
    	})   
    })
}
start();





