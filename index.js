// console.log(paper, 'paper')
// console.log(answer, 'answer')

// options  attachment



let CDATA = ['element_caption', 'element_text', 'question_text', 'sentences', 'options', 'content', 'knowledge', 'extend', 'attachment', 'analysis', 'directions', 'option', 'answer', 'answers', 'content_cn', 'item']
function xmlToDom(string) {
    let DomParser = new window.DOMParser()
    let xmlDoc = DomParser.parseFromString(string, "text/xml").children[0];
    return xmlDoc;
}
var paperDom = xmlToDom(paper);
var answerDom = xmlToDom(answer);

console.log(paperDom, 'paperDom')
console.log(answerDom, 'answerDom')

function DomtoObj(dom) {
    if (dom && (dom.nodeType === 1 || dom.nodeType === 9)) {
        return domDeep(dom)
    } else {
        console.warn('参数不是一个dom')
    }
}

function domDeep(dom) {
    let obj = {};
    obj.nodeName = dom.nodeName;

    if (dom.attributes && dom.attributes.length) {
        obj.attributes = attributesToObj(dom)
    }

    if (dom.hasChildNodes()) {
        var children = [];
        Array.from(dom.children).forEach(element => {
            children.push(elementToObj(element))
        });
        obj.children = children;
    }
    return obj;
}

function elementToObj(element) {
    let obj = {};
    obj.nodeName = element.nodeName;
    if (element.hasChildNodes()) {      
        Array.from(element.children).forEach(item => {
            if (item.children && item.children.length) {
                let list = [];
                Array.from(item.children).forEach(items => {
                    list.push(elementToObj(items))
                })
                obj[item.nodeName] = list;
            } else {
                if (item.nodeName === 'attachment' && item.textContent && item.textContent.trim()) {
                    let attachment =  unescape(item.textContent);
                    let xmlCode = attachment.slice(attachment.indexOf('<root>'))
                    let xmlObj = DomtoObj(xmlToDom(xmlCode));
                    // debugger
                    let record_follow_read = {}
                    xmlObj.children.forEach(el => {
                        switch (el.nodeName) {
                            case "text":
                                let paragraph_list = []
                                el.paragraph && el.paragraph.forEach(ele => {
                                    let net_files = [ele.netfiles[0].netfile]
                                    paragraph_list.push({
                                        pre: '',
                                        sentences: [{
                                            ...ele,
                                            net_files,
                                            content_en: ele.content
                                        }]
                                    })
                                })
                                record_follow_read.paragraph_list = paragraph_list
                                break;
                            case "modes":
                                let mode_list = []
                                el.mode && el.mode.forEach(_ => {
                                    mode_list.push({
                                        sentences: el.mode
                                    })
                                })
                                record_follow_read.mode_list = mode_list
                                break;
                           
                                case "answers":
                                    record_follow_read.answers = el.answers
                                    break;
                                case "baseurl":
                                    record_follow_read.baseurl = el.baseurl
                                break;
                        
                            default:
                                break;
                        }
                    })
                    console.log(xmlObj, 'xmlObj')

                    obj[item.nodeName] = xmlObj
                    obj.record_follow_read = record_follow_read;
                    if (!obj.deleteAttributeList) {
                        obj.deleteAttributeList = []
                    }
                    obj.deleteAttributeList.push('record_follow_read')

                } else {
                    if (CDATA.includes(item.nodeName)) {
                        obj[item.nodeName] = item.textContent.trim();
                    } else {
                        obj[item.nodeName] = item.innerHTML.trim();
                    }
                }
            }
        })
    }
   
    if (element.children && !element.children.length) {
        if (CDATA.includes(element.nodeName)) {
            obj[element.nodeName] = element.textContent.trim();
        } else {
            obj[element.nodeName] = element.innerHTML.trim();
        }
    }
    obj = {
        ...obj,
        ...attributesToObj(element),
        attributes: attributesToObj(element)
    } 
    if (obj.nodeName === 'element') {
        obj.elementId = obj.id
    }   
    return obj;
}

function attributesToObj(dom) {
    let obj = {};
    Object.values(dom.attributes).forEach(item => {
        obj[item.name] = item.value
    })
    return obj
}


var paperDomObj = DomtoObj(paperDom);
var answerDomObj = DomtoObj(answerDom);



console.log(paperDomObj, 'paperDom')
console.log(answerDomObj, 'answerDom')

