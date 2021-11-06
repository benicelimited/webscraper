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
                        .setName('CapCityMonitor')
                        .setThumbnail(filteredProds[i].img)
                        .addField('Name', JSON.stringify(filteredProds[i].name).replace(/["]+/g, ''))
                        .addField('Color', JSON.stringify(filteredProds[i].color ? filteredProds[i].color : "Null").replace(/["]+/g, ''), true)
                        .addField('Price', JSON.stringify(filteredProds[i].price), true)
                        .addField('Size', JSON.stringify(filteredProds[i].size ? filteredProds[i].size : "Null").replace(/["]+/g, ''), true)
                        .addField('Available Stock', JSON.stringify(filteredProds[i].stock).replace(/["]+/g, ''), true)
                        .setFooter("FittedACO", "https://i.imgur.com/01hPA0N.png")
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
    async addToCart() {

        try {
            this.profile != null ? console.log('Profile loaded') : console.log('Please create Profile')


            if (this.profile != null) {
                if (this.url != null) {
                    await this.getProductDetails()
                        .then(async props => {
                            console.log('Adding To Cart')
                            this.__headers = {
                                'upgrade-insecure-requests': '1',
                                'origin': 'https://www.shopcapcity.com',
                                'content-type': 'multipart/form-data',
                                'user-agent': this.UA,
                                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                            }
                            this.__data = {
                                'attribute_size': this.size != null ? this.size : props.size,
                                'attribute_color': this.color,
                                'quantity': this.quantity != null ? this.quantity : '1',
                                'add-to-cart': props.productID,
                                'product_id': props.productID,
                                'variation_id': this.variantID != null ? this.variantID : props.variant
                            }

                            await request.post(this.url, {
                                headers: this.__headers,
                                formData: this.__data,
                                resolveWithFullResponse: true,
                                followAllRedirects: true
                            })
                                .then(async response => {
                                    console.log('Cart Success')
                                    //console.log(atc.body)
                                    let sdata = $.load(response.body)
                                    //let rawstring = sdata('[id="wc-cart-js-extra"]').get()[0].children[0].data
                                    this.shippingNounce = sdata('[type="hidden"]').get()[0].attribs.value
                                    console.log('Checking Out')
                                })
                                .then(async () => {

                                    console.log("Getting Shipping Rates")

                                    this.checkoutFormHeaders = {
                                        "User-Agent": this.UA,
                                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                                    }
                                    let shippingData = {
                                        "calc_shipping_country": "US",
                                        "calc_shipping_state": profile.state,
                                        "calc_shipping_city": profile.city,
                                        "calc_shipping_postcode": profile.zipCode,
                                        "woocommerce-shipping-calculator-nonce": this.shippingNounce,
                                        "_wp_http_referer": "/cart/",
                                        " calc_shipping": "x"
                                    }
                                    await request.post('https://www.shopcapcity.com/cart/', {
                                        headers: this.checkoutFormHeaders,
                                        formData: shippingData,
                                        resolveWithFullResponse: true,
                                        json: true
                                    })
                                        .then(async resolve => {
                                            console.log("Updating Shipping Choice")
                                            await request.post('https://www.shopcapcity.com/?wc-ajax=update_shipping_method/', {

                                                headers: this.checkoutFormHeaders,
                                                body: JSON.stringify(shippingData),
                                                resolveWithFullResponse: true
                                            })
                                                .then(async res => {

                                                    //console.log(res.statusMessage)
                                                    await request.get('https://www.shopcapcity.com/checkout/', {
                                                        headers: this.checkoutFormHeaders,
                                                        resolveWithFullResponse: true
                                                    })
                                                        .then(async res => {
                                                            let _data = $.load(res.body)
                                                            this.woocommercePaymentCode = _data('[id="woocommerce-process-checkout-nonce"]').attr('value')

                                                            let _token = {

                                                                "cardNumber": profile.cardNum,
                                                                "expirationDate": profile.cardExp,
                                                                "cardCode": profile.cvc,
                                                                "zip": profile.zipCode,
                                                                "fullName": profile.fname + " " + profile.lname
                                                            }

                                                            let __data = {
                                                                "securePaymentContainerRequest": {
                                                                    "merchantAuthentication": {
                                                                        "name": "46MkXEtgnC27",
                                                                        "clientKey": "3Bd4b5ADp3ThGfSckTyts7qg2VLX4k2TCMN64w6z7q58T7BrM6p3Jum4Wu6y2SR6"
                                                                    },
                                                                    "data": {
                                                                        "type": "TOKEN",
                                                                        "id": 'aa154e76-6e1f-5a9c-6e6a-9f7a7c94344',
                                                                        "token": _token

                                                                    }
                                                                }

                                                            }
                                                            let stringed__data = JSON.stringify(__data)
                                                            console.log('Encrypting Card.....')
                                                            const encryptCard = await request.post('https://api2.authorize.net/xml/v1/request.api',
                                                                {
                                                                    headers: { 'User-Agent': this.UA },
                                                                    body: stringed__data,
                                                                    //resolveWithFullResponse:true

                                                                })
                                                            //console.log(encryptCard)
                                                            let encryptedToken = encryptCard.slice(76, 292)
                                                            let values = { security: this.shippingNounce, woocommerceCode: this.woocommercePaymentCode, vaultedCard: encryptedToken }
                                                            console.log('....Encryption Completed')
                                                            return values
                                                        })
                                                        .then(async values => {
                                                            console.log('Submitting Form')
                                                            let _header = {

                                                                'content-type': "application/x-www-form-urlencoded; charset=UTF-8",
                                                                'user-agent': this.UA,
                                                                'origin': "https://www.shopcapcity.com",
                                                                'referer': "https://www.shopcapcity.com/checkout/",
                                                            }
                                                            let _body = `billing_first_name=${profile.fname}&billing_last_name=${profile.lname}&billing_company=&billing_country=US&billing_address_1=${profile.address}&billing_address_2=&billing_city=${profile.city}&billing_state=${profile.state}&billing_postcode=${profile.zipCode}&billing_phone=${profile.phoneNum}&billing_email=${profile.email}&account_username=& account_password=&shipping_first_name=${profile.fname}&shipping_last_name=${profile.lname}&shipping_company=&shipping_country=US&shipping_address_1=${profile.address}&shipping_address_2=&shipping_city=${profile.city}&shipping_state=${profile.state}&shipping_postcode=${profile.zipCode}&shipping_phone=${profile.phoneNum}&order_comments=&shipping_method[0]=usps_first_class&payment_method=authorize_net_cim_credit_card&wc-authorize-net-cim-credit-card-expiry=${profile.cvc}&wc-authorize-net-cim-credit-card-payment-nonce=${values.vaultedCard}&wc-authorize-net-cim-credit-card-payment-descriptor=COMMON.ACCEPT.INAPP.PAYMENT&wc-authorize-net-cim-credit-card-last-four=${profile.cardNum.slice(12, 16)}&wc-authorize-net-cim-credit-card-card-type=${profile.cardType}&terms=on&terms-field=1&woocommerce-process-checkout-nonce=${values.woocommerceCode}&_wp_http_referer=/?wc-ajax=update_order_review`
                                                            let stringBod = JSON.stringify(_body)
                                                            await request.post('https://www.shopcapcity.com/?wc-ajax=checkout', {
                                                                headers: _header,
                                                                body: encodeURIComponent(_body),


                                                            })
                                                                .then(response => console.log(response))
                                                        })




                                                })
                                        })
                                })






                        })


                }
            }

        } catch (err) {
            console.log(err)
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





