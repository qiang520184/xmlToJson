// console.log(paper, 'paper')
// console.log(answer, 'answer')
let CDATA = ['element_caption', 'element_text', 'question_text', 'options', 'knowledge', 'extend', 'attachment', 'analysis', 'directions', 'option', 'answer']
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
                console.log('nodeNamenodeNamenodeName', item.children, list)

                obj[item.nodeName] = list;
            } else {
                if (CDATA.includes(item.nodeName)) {
                    obj[item.nodeName] = item.textContent.trim();
                } else {
                    obj[item.nodeName] = item.innerHTML.trim();
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
        attributes: attributesToObj(element)
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

// console.log(paperDomObj, 'paperDom')
// console.log(answerDomObj, 'answerDom')

function toObj(paperDomObj, answerDomObj) {
    let pageConfig = {};
    let paperMap = {};
    let answerMap = {};
    let elementMap = {};
    let attachment = [];
    answerDomObj.children && answerDomObj.children.forEach(item => {
        let id = item.attributes.id;
        answerMap[id] = item;
    })
    paperDomObj.children && paperDomObj.children.forEach(item => {
        let { id, type } = item.attributes;
        paperMap[id] = item;      
        switch (type) {
            case '0':
                // 标题
                pageConfig = {
                    ...pageConfig,
                    ...item,
                }
                break;
            case '1':
                
                if (item.is_group_text === '1') {
                    // 组合题
                    elementMap[id] = {
                        ...item,
                        questionList: []
                    }
                } else {
                 // 附件 attachment
                    attachment.push(item)
                }
                break;
            case '2':
                // 大题
                break;
            case '3':
                // 组合题子题
                let questionObj = {
                    ...item,
                    answerObj: {
                        ...answerMap[id]
                    }
                }
                if (item.ref_sub_id) {
                    elementMap[item.ref_question_id].questionList.push(questionObj)
                } else {
                    elementMap[id] = questionObj
                }
                break;
            default:
                break;
        }
    })
    // 合并对象
    pageConfig.attachment = attachment;
    pageConfig.slides = Object.values(elementMap);

    console.log('[ pageConfig ] >', pageConfig)
    console.log('[ pageConfig ] >', JSON.stringify(pageConfig))

    console.log('[ elementMap ] >', elementMap)
    console.log('[ attachment ] >', attachment)

    return pageConfig;
}
let obj = toObj(paperDomObj, answerDomObj)
console.log(obj, 'obj')

function toXml(obj) {
    let xml = '';
    let answerXml = '';
    let { attachment, slides, ...elementObj } = obj;
    xml += objectCreateDom(elementObj);
    
    console.log(elementObj, 'elementObj')
    console.log(attachment, 'attachment')
    console.log(slides, 'slides')
   
    attachment && attachment.forEach(item => {
        xml += objectCreateDom(item);
    })
    slides && slides.forEach(item => {
        let { answerObj, questionList, ...xmlObj } = item
        if (answerObj) {
            answerXml += objectCreateDom(answerObj);
        }
        if (item.is_group_text === '1') {
            questionList.forEach(items => {
                xml += objectCreateDom(items);
                answerXml += objectCreateDom(items.answerObj);
            })
        }
        xml += objectCreateDom(xmlObj);
    })

    console.log(xml, 'xml')
    console.log(answerXml, 'answerXml')

    return {
        xml,
        answerXml
    }
}
toXml(obj);
function objectCreateDom(obj) {
    let { nodeName, attributes, ...contentObj } = obj;
    let content =  '';
    if (!contentObj.hasOwnProperty(nodeName)) {
        Object.entries(contentObj).forEach(item => {
            let [name, value] = item;
            if (Array.isArray(value)) {
                let childrenDom = '';
                value.forEach(items => {
                    childrenDom += objectCreateDom(items);
                })
                content += createXml({ name, value: childrenDom, cDataFlag: true })
            } else {
                content += createXml({ name, value })
            }
            
        })
    } else {
        content = contentObj[nodeName];  
    }
    let attr = attributesToString(attributes);
    let dom = createXml({name: nodeName, attr, value: content})
    return dom;
}

function attributesToString(obj) {
    let str = ''
    Object.entries(obj).forEach(item => {
        let [key, value] = item;
        str+= ` ${key}="${value}"`
    })
    return str
}
function createXml(obj) {
    let { name, value, attr, cDataFlag } = obj;
    let flag = CDATA.indexOf(name) >= 0 && !cDataFlag;
    // <![CDATA[ 答案内容 ]]>
    let content = flag ? `<![CDATA[${value || ''}]]>` : value;
    return `<${name} ${attr || ''}>${content || ''}</${name}>`;
  }