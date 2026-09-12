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
  "mouseThrough": true,
  "_$comp": [
    {
      "_$type": "3fb2fa99-4ac0-4bd1-9c10-f2118aa5c67c",
      "scriptPath": "../src/load.ts"
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
      "_$child": [
        {
          "_$id": "ledrhvck",
          "_$type": "Camera2D",
          "name": "Camera2D",
          "x": 284,
          "y": -95,
          "width": 1146,
          "height": 1591,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "mouseThrough": true,
          "isMain": true,
          "positionSpeed": null
        }
      ]
    },
    {
      "_$id": "eh7snqyt",
      "_$type": "Sprite",
      "name": "Sprite",
      "x": 32,
      "y": 628,
      "width": 1087,
      "height": 1290,
      "mouseThrough": true,
      "_gcmds": [
        {
          "_$type": "DrawRectCmd",
          "fillColor": "#c6a478"
        }
      ]
    },
    {
      "_$id": "90d5d7xj",
      "_$var": true,
      "_$type": "ViewStack",
      "name": "list",
      "x": 92,
      "y": 1016,
      "width": 1054,
      "height": 587,
      "_mouseState": 2,
      "mouseThrough": true,
      "selectedIndex": 0,
      "_$child": [
        {
          "_$id": "b13lfvye",
          "_$type": "Box",
          "name": "item0",
          "x": -24,
          "y": -3,
          "width": 1054,
          "height": 587,
          "_mouseState": 2,
          "left": -24,
          "right": 24,
          "top": -3,
          "bottom": 3,
          "_$child": [
            {
              "_$id": "24bxquar",
              "_$var": true,
              "_$type": "List",
              "name": "List",
              "x": 117,
              "y": -229,
              "width": 732,
              "height": 758,
              "centerX": -44,
              "itemTemplate": {
                "_$ref": "hzsj3hcv",
                "_$tmpl": "itemRender"
              },
              "repeatX": 2,
              "repeatY": 4,
              "spaceX": 6,
              "spaceY": 91,
              "scrollType": 3,
              "_$child": [
                {
                  "_$id": "hzsj3hcv",
                  "_$type": "Box",
                  "name": "item",
                  "x": 40,
                  "y": 33,
                  "width": 276,
                  "height": 168,
                  "_$child": [
                    {
                      "_$id": "sz15fflj",
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
                      "_$id": "r83s3jwz",
                      "_$type": "Label",
                      "name": "name",
                      "x": 135,
                      "y": 35,
                      "width": 120,
                      "height": 28,
                      "text": "？？？",
                      "fontSize": 20,
                      "color": "#ffffff",
                      "letterSpacing": 0
                    },
                    {
                      "_$id": "4ctm4u6h",
                      "_$type": "Label",
                      "name": "num",
                      "x": 134,
                      "y": 69,
                      "width": 120,
                      "height": 28,
                      "text": "0",
                      "fontSize": 20,
                      "color": "#ffffff",
                      "letterSpacing": 0
                    },
                    {
                      "_$id": "s5263s7h",
                      "_$type": "Label",
                      "name": "game",
                      "x": 133,
                      "y": 104,
                      "width": 120,
                      "height": 28,
                      "text": "？？？",
                      "fontSize": 20,
                      "color": "#ffffff",
                      "letterSpacing": 0
                    }
                  ]
                }
              ]
            },
            {
              "_$id": "luwxi4ar",
              "_$type": "Box",
              "name": "Box",
              "x": -65,
              "y": 791,
              "width": 1103,
              "height": 126,
              "centerX": -41,
              "_$child": [
                {
                  "_$id": "zpx413tx",
                  "_$var": true,
                  "_$type": "Button",
                  "name": "quickMatchBtn",
                  "x": 605,
                  "y": -127,
                  "width": 300,
                  "height": 80,
                  "skin": "",
                  "label": "一键匹配",
                  "labelColors": "#ffffff,#ffffff,#ffffff",
                  "labelAlign": "center",
                  "labelVAlign": "middle"
                },
                {
                  "_$id": "uxy98uk7",
                  "_$var": true,
                  "_$type": "Button",
                  "name": "createRoomBtn",
                  "x": 191,
                  "y": -120,
                  "width": 300,
                  "height": 80,
                  "skin": "",
                  "label": "创建房间",
                  "labelColors": "#ffffff,#ffffff,#ffffff",
                  "labelAlign": "center",
                  "labelVAlign": "middle"
                },
                {
                  "_$id": "prevPageBtn",
                  "_$var": true,
                  "_$type": "Button",
                  "name": "prevPageBtn",
                  "x": 231,
                  "y": -230,
                  "width": 200,
                  "height": 80,
                  "skin": "",
                  "label": "上一页",
                  "labelColors": "#ffffff,#ffffff,#ffffff",
                  "labelAlign": "center",
                  "labelVAlign": "middle"
                },
                {
                  "_$id": "pageInfoText",
                  "_$var": true,
                  "_$type": "Text",
                  "name": "pageInfoText",
                  "x": 450,
                  "y": -227,
                  "width": 200,
                  "height": 68,
                  "mouseThrough": true,
                  "text": "第1/1页",
                  "fontSize": 28,
                  "color": "#ffffff",
                  "align": "center",
                  "valign": "middle",
                  "leading": 2,
                  "letterSpacing": 0
                },
                {
                  "_$id": "nextPageBtn",
                  "_$var": true,
                  "_$type": "Button",
                  "name": "nextPageBtn",
                  "x": 658,
                  "y": -232,
                  "width": 200,
                  "height": 80,
                  "skin": "",
                  "label": "下一页",
                  "labelColors": "#ffffff,#ffffff,#ffffff",
                  "labelAlign": "center",
                  "labelVAlign": "middle"
                },
                {
                  "_$id": "roomIdInput",
                  "_$var": true,
                  "_$type": "TextInput",
                  "name": "roomIdInput",
                  "x": 344,
                  "y": -20,
                  "width": 268,
                  "height": 78,
                  "centerY": -44,
                  "text": "",
                  "fontSize": 32,
                  "bgColor": "#ffffff",
                  "letterSpacing": 0,
                  "padding": "1,1,1,3",
                  "prompt": "输入房间ID",
                  "promptColor": "#888888"
                },
                {
                  "_$id": "joinByIdBtn",
                  "_$var": true,
                  "_$type": "Button",
                  "name": "joinByIdBtn",
                  "x": 637,
                  "y": -20,
                  "width": 190,
                  "height": 80,
                  "centerY": -43,
                  "skin": "",
                  "label": "加入",
                  "labelColors": "#ffffff,#ffffff,#ffffff",
                  "labelAlign": "center",
                  "labelVAlign": "middle"
                }
              ]
            }
          ]
        },
        {
          "_$id": "329gy78y",
          "_$type": "Box",
          "name": "item1",
          "width": 1054,
          "height": 587,
          "visible": false,
          "_mouseState": 2,
          "left": 0,
          "right": 0,
          "top": 0,
          "bottom": 0,
          "_$child": [
            {
              "_$id": "pve1btn01",
              "_$var": true,
              "_$type": "Button",
              "name": "pve1",
              "x": 150,
              "y": 250,
              "width": 300,
              "height": 80,
              "skin": "",
              "label": "单打人机",
              "labelColors": "#ffffff,#ffffff,#ffffff",
              "labelAlign": "center",
              "labelVAlign": "middle"
            },
            {
              "_$id": "pve2btn02",
              "_$var": true,
              "_$type": "Button",
              "name": "pve2",
              "x": 600,
              "y": 250,
              "width": 300,
              "height": 80,
              "skin": "",
              "label": "双打人机",
              "labelColors": "#ffffff,#ffffff,#ffffff",
              "labelAlign": "center",
              "labelVAlign": "middle"
            }
          ]
        }
      ]
    },
    {
      "_$id": "statusText",
      "_$var": true,
      "_$type": "Text",
      "name": "statusText",
      "x": 366,
      "y": 477,
      "width": 400,
      "height": 100,
      "text": "正在连接服务器...",
      "fontSize": 32,
      "color": "#ffff00",
      "align": "center",
      "valign": "middle",
      "leading": 2,
      "letterSpacing": 0
    },
    {
      "_$id": "2h9fyb90",
      "_$type": "Panel",
      "name": "Panel",
      "x": 47,
      "y": 643,
      "width": 1053,
      "height": 123,
      "mouseThrough": true,
      "scrollType": 1,
      "_$child": [
        {
          "_$id": "1h4a50xk",
          "_$type": "HBox",
          "name": "HBox",
          "x": 9,
          "y": 11,
          "width": 1024,
          "height": 101,
          "_mouseState": 2,
          "mouseThrough": true,
          "centerY": 0,
          "space": 0,
          "_$child": [
            {
              "_$id": "ii1bnhl6",
              "_$type": "Text",
              "name": "pvp",
              "width": 414,
              "height": 102,
              "text": "PVP",
              "font": "ArialUnicodeMS",
              "fontSize": 80,
              "color": "#ff4d69",
              "align": "center",
              "valign": "middle",
              "borderColor": "#ffffff",
              "leading": 2,
              "letterSpacing": 0,
              "underlineColor": "#ffffff",
              "stroke": 30,
              "strokeColor": "#8a6454"
            },
            {
              "_$id": "2tg3s7m7",
              "_$type": "Text",
              "name": "pve",
              "x": 414,
              "width": 414,
              "height": 102,
              "text": "PVE",
              "font": "ArialUnicodeMS",
              "fontSize": 80,
              "color": "#ffffff",
              "align": "center",
              "valign": "middle",
              "leading": 2,
              "letterSpacing": 0,
              "strokeColor": "#95956c",
              "shadowBlur": 1
            }
          ]
        }
      ]
    }
  ]
}