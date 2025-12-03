{
  "_$ver": 1,
  "_$id": "r9tk9vtj",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "Scene2D",
  "width": 1170,
  "height": 2532,
  "_$comp": [
    {
      "_$type": "ffe31ed4-6cb3-4a15-8c03-54b0439c636b",
      "scriptPath": "../src/load.ts",
      "roomList": {
        "_$ref": "x67wk3hh"
      },
      "createRoomBtn": {
        "_$ref": "ip5yvcgk"
      },
      "refreshBtn": {
        "_$ref": "fllir5k3"
      },
      "statusText": {
        "_$ref": "efg7rbic"
      },
      "prevPageBtn": {
        "_$ref": "gsnslxn5"
      },
      "nextPageBtn": {
        "_$ref": "cy0jevjt"
      },
      "pageInfoText": {
        "_$ref": "trdaw6dn"
      },
      "roomIdInput": {
        "_$ref": "bq7e9xow"
      },
      "joinByIdBtn": {
        "_$ref": "3t5qrt7z"
      },
      "quickMatchBtn": {
        "_$ref": "lnpn7iif"
      }
    }
  ],
  "_$child": [
    {
      "_$id": "e77sacmm",
      "_$type": "Area2D",
      "name": "Area2D",
      "x": 296,
      "y": 1332,
      "width": 600,
      "height": 400,
      "mouseThrough": true,
      "_$child": [
        {
          "_$id": "ledrhvck",
          "_$type": "Camera2D",
          "name": "Camera2D",
          "x": 288,
          "y": -357,
          "width": 1154,
          "height": 1943,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "mouseThrough": true,
          "isMain": true,
          "positionSpeed": null
        },
        {
          "_$id": "15hkq8oh",
          "_$type": "Tab",
          "name": "Tab",
          "x": -256,
          "y": -1076,
          "width": 512,
          "height": 50,
          "scaleX": 2,
          "scaleY": 2,
          "_mouseState": 2,
          "centerX": -44,
          "skin": "res://e78c304b-e385-4c4b-a9be-d755ed561a74",
          "labels": "tab1,tab2",
          "space": 0,
          "selectedIndex": 0,
          "labelFont": null,
          "labelSize": 40,
          "labelColors": "#32556b,#ffeae2,#959595",
          "labelStroke": null,
          "strokeColors": null
        },
        {
          "_$id": "y21yao6n",
          "_$var": true,
          "_$type": "ViewStack",
          "name": "list",
          "x": -265,
          "y": -963,
          "width": 1102,
          "height": 949,
          "_mouseState": 2,
          "mouseThrough": true,
          "selectedIndex": 0,
          "_$child": [
            {
              "_$id": "05v4i8ql",
              "_$type": "Box",
              "name": "item0",
              "width": 1102,
              "height": 949,
              "_mouseState": 2,
              "left": 0,
              "right": 0,
              "top": 0,
              "bottom": 0,
              "_$child": [
                {
                  "_$id": "hcbx7g5c",
                  "_$type": "Button",
                  "name": "Button",
                  "x": 152,
                  "y": 177,
                  "width": 799,
                  "height": 595,
                  "_mouseState": 2,
                  "centerX": 0,
                  "centerY": 0,
                  "skin": "",
                  "label": "匹配",
                  "labelSize": 108,
                  "labelBold": true,
                  "labelAlign": "center",
                  "labelVAlign": "middle",
                  "labelStrokeColor": "#32556b"
                }
              ]
            },
            {
              "_$id": "3rpqwdnw",
              "_$type": "Box",
              "name": "item1",
              "width": 1102,
              "height": 949,
              "visible": false,
              "_mouseState": 2,
              "left": 0,
              "right": 0,
              "top": 0,
              "bottom": 0,
              "_$child": [
                {
                  "_$id": "55sl8fp5",
                  "_$type": "Sprite",
                  "name": "boom",
                  "x": -15,
                  "y": 24,
                  "width": 950,
                  "height": 500,
                  "zIndex": 2,
                  "_gcmds": [
                    {
                      "_$type": "FillTextCmd",
                      "text": "Loading...",
                      "x": 50,
                      "y": 50,
                      "fontFamily": "SimSun",
                      "fontSize": 100,
                      "italic": true,
                      "align": null
                    },
                    {
                      "_$type": "DrawRectCmd",
                      "lineWidth": 2,
                      "lineColor": "#000000"
                    }
                  ]
                }
              ]
            },
            {
              "_$id": "zw4l8ujk",
              "_$type": "Box",
              "name": "item0_1",
              "width": 1102,
              "height": 949,
              "_mouseState": 2,
              "left": 0,
              "right": 0,
              "top": 0,
              "bottom": 0,
              "_$child": [
                {
                  "_$id": "x67wk3hh",
                  "_$var": true,
                  "_$type": "List",
                  "name": "List",
                  "x": 375,
                  "y": -292,
                  "width": 732,
                  "height": 997,
                  "centerX": 190,
                  "itemTemplate": {
                    "_$ref": "v455kwsl",
                    "_$tmpl": "itemRender"
                  },
                  "repeatX": 2,
                  "repeatY": 5,
                  "_$child": [
                    {
                      "_$id": "v455kwsl",
                      "_$type": "Box",
                      "name": "item",
                      "x": 10,
                      "y": 10,
                      "width": 276,
                      "height": 168,
                      "left": 10,
                      "top": 10,
                      "_$child": [
                        {
                          "_$id": "mq2i0rgb",
                          "_$type": "Image",
                          "name": "Image",
                          "x": 5,
                          "y": 26,
                          "width": 105,
                          "height": 117,
                          "left": 5,
                          "centerY": 0,
                          "color": "#ffffff"
                        },
                        {
                          "_$id": "9dc3npmj",
                          "_$type": "Label",
                          "name": "name",
                          "x": 135,
                          "y": 35,
                          "width": 120,
                          "height": 28,
                          "text": "？？？",
                          "fontSize": 20,
                          "color": "#ffffff"
                        },
                        {
                          "_$id": "g4scjeje",
                          "_$type": "Label",
                          "name": "num",
                          "x": 134,
                          "y": 69,
                          "width": 120,
                          "height": 28,
                          "text": "0",
                          "fontSize": 20,
                          "color": "#ffffff"
                        },
                        {
                          "_$id": "hcop8xkf",
                          "_$type": "Label",
                          "name": "game",
                          "x": 133,
                          "y": 104,
                          "width": 120,
                          "height": 28,
                          "text": "？？？",
                          "fontSize": 20,
                          "color": "#ffffff"
                        }
                      ]
                    }
                  ]
                },
                {
                  "_$id": "wpuf5jug",
                  "_$type": "Box",
                  "name": "Box",
                  "x": 159,
                  "y": 768,
                  "width": 1164,
                  "height": 200,
                  "mouseThrough": true,
                  "centerX": 190,
                  "_$child": [
                    {
                      "_$id": "4qjrp7mu",
                      "_$type": "Text",
                      "name": "title",
                      "x": 382,
                      "y": -1283,
                      "width": 400,
                      "height": 100,
                      "text": "联机对战房间",
                      "fontSize": 60,
                      "color": "#ffffff",
                      "align": "center",
                      "valign": "middle",
                      "leading": 2
                    },
                    {
                      "_$id": "zgz61iwy",
                      "_$type": "Box",
                      "name": "Box_2",
                      "x": 287,
                      "y": -410,
                      "width": 591,
                      "height": 200,
                      "centerX": 0,
                      "_$child": [
                        {
                          "_$id": "fllir5k3",
                          "_$var": true,
                          "_$type": "Button",
                          "name": "refreshBtn",
                          "y": 569,
                          "width": 300,
                          "height": 80,
                          "left": 0,
                          "skin": "",
                          "label": "刷新列表",
                          "labelColors": "#ffffff,#ffffff,#ffffff",
                          "labelAlign": "center",
                          "labelVAlign": "middle"
                        },
                        {
                          "_$id": "lnpn7iif",
                          "_$var": true,
                          "_$type": "Button",
                          "name": "quickMatchBtn",
                          "x": 146,
                          "y": 708,
                          "width": 300,
                          "height": 80,
                          "centerX": 0,
                          "skin": "",
                          "label": "一键匹配",
                          "labelColors": "#ffffff,#ffffff,#ffffff",
                          "labelAlign": "center",
                          "labelVAlign": "middle"
                        },
                        {
                          "_$id": "ip5yvcgk",
                          "_$var": true,
                          "_$type": "Button",
                          "name": "createRoomBtn",
                          "x": 291,
                          "y": 571,
                          "width": 300,
                          "height": 80,
                          "right": 0,
                          "skin": "",
                          "label": "创建房间",
                          "labelColors": "#ffffff,#ffffff,#ffffff",
                          "labelAlign": "center",
                          "labelVAlign": "middle"
                        },
                        {
                          "_$id": "efg7rbic",
                          "_$var": true,
                          "_$type": "Text",
                          "name": "statusText",
                          "x": 95,
                          "y": -780,
                          "width": 400,
                          "height": 100,
                          "text": "正在连接服务器...",
                          "fontSize": 32,
                          "color": "#ffff00",
                          "align": "center",
                          "valign": "middle",
                          "leading": 2
                        }
                      ]
                    },
                    {
                      "_$id": "dst8s4nv",
                      "_$type": "Box",
                      "name": "Box_1",
                      "x": 282,
                      "width": 600,
                      "height": 200,
                      "centerX": 0,
                      "_$child": [
                        {
                          "_$id": "gsnslxn5",
                          "_$var": true,
                          "_$type": "Button",
                          "name": "prevPageBtn",
                          "x": -14,
                          "y": -26,
                          "width": 200,
                          "height": 80,
                          "skin": "",
                          "label": "上一页",
                          "labelColors": "#ffffff,#ffffff,#ffffff",
                          "labelAlign": "center",
                          "labelVAlign": "middle"
                        },
                        {
                          "_$id": "trdaw6dn",
                          "_$var": true,
                          "_$type": "Text",
                          "name": "pageInfoText",
                          "x": 186,
                          "y": -26,
                          "width": 200,
                          "height": 80,
                          "text": "第1/1页",
                          "fontSize": 28,
                          "color": "#ffffff",
                          "align": "center",
                          "valign": "middle",
                          "leading": 2
                        },
                        {
                          "_$id": "cy0jevjt",
                          "_$var": true,
                          "_$type": "Button",
                          "name": "nextPageBtn",
                          "x": 386,
                          "y": -26,
                          "width": 200,
                          "height": 80,
                          "skin": "",
                          "label": "下一页",
                          "labelColors": "#ffffff,#ffffff,#ffffff",
                          "labelAlign": "center",
                          "labelVAlign": "middle"
                        }
                      ]
                    },
                    {
                      "_$id": "av16y5g8",
                      "_$type": "Box",
                      "name": "Box",
                      "x": 284,
                      "width": 596,
                      "height": 200,
                      "centerX": 0,
                      "_$child": [
                        {
                          "_$id": "bq7e9xow",
                          "_$var": true,
                          "_$type": "TextInput",
                          "name": "roomIdInput",
                          "x": -9,
                          "y": 453,
                          "width": 400,
                          "height": 80,
                          "centerY": 393,
                          "text": "",
                          "fontSize": 32,
                          "bgColor": "#ffffff",
                          "padding": "1,1,1,3",
                          "prompt": "输入房间ID",
                          "promptColor": "#888888"
                        },
                        {
                          "_$id": "3t5qrt7z",
                          "_$var": true,
                          "_$type": "Button",
                          "name": "joinByIdBtn",
                          "x": 411,
                          "y": 453,
                          "width": 190,
                          "height": 80,
                          "centerY": 393,
                          "skin": "",
                          "label": "加入",
                          "labelColors": "#ffffff,#ffffff,#ffffff",
                          "labelAlign": "center",
                          "labelVAlign": "middle"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "_$id": "l8mat90n",
          "_$type": "Sprite",
          "name": "Sprite",
          "x": -271,
          "y": -966,
          "width": 1108,
          "height": 949,
          "mouseThrough": true,
          "_gcmds": [
            {
              "_$type": "DrawRectCmd",
              "fillColor": "#c6a478"
            }
          ]
        },
        {
          "_$id": "488q2w7m",
          "_$type": "Panel",
          "name": "Panel",
          "x": -268,
          "y": -1092,
          "width": 1107,
          "height": 123,
          "mouseThrough": true,
          "scrollType": 1,
          "_$child": [
            {
              "_$id": "xqbo704m",
              "_$type": "HBox",
              "name": "HBox",
              "x": 1,
              "y": 14,
              "width": 1106,
              "height": 95,
              "_mouseState": 2,
              "mouseThrough": true,
              "left": 0,
              "centerX": 0,
              "centerY": 0,
              "space": 86,
              "_$child": [
                {
                  "_$id": "11htiay4",
                  "_$type": "Text",
                  "name": "add",
                  "width": 300,
                  "height": 102,
                  "text": "加入房间",
                  "font": "ArialUnicodeMS",
                  "fontSize": 40,
                  "color": "#ffffff",
                  "align": "center",
                  "valign": "middle",
                  "leading": 2
                },
                {
                  "_$id": "esjspl8d",
                  "_$type": "Text",
                  "name": "match",
                  "x": 386,
                  "width": 300,
                  "height": 102,
                  "text": "匹配",
                  "font": "ArialUnicodeMS",
                  "fontSize": 40,
                  "color": "#ffffff",
                  "align": "center",
                  "valign": "middle",
                  "leading": 2
                },
                {
                  "_$id": "9b5388zt",
                  "_$type": "Text",
                  "name": "craete",
                  "x": 772,
                  "width": 300,
                  "height": 102,
                  "text": "创建房间",
                  "font": "ArialUnicodeMS",
                  "fontSize": 40,
                  "color": "#ffffff",
                  "align": "center",
                  "valign": "middle",
                  "leading": 2
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}