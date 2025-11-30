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
        "_$ref": "24bxquar"
      },
      "createRoomBtn": {
        "_$ref": "uxy98uk7"
      },
      "refreshBtn": {
        "_$ref": "refreshBtn"
      },
      "statusText": {
        "_$ref": "statusText"
      },
      "prevPageBtn": {
        "_$ref": "prevPageBtn"
      },
      "nextPageBtn": {
        "_$ref": "nextPageBtn"
      },
      "pageInfoText": {
        "_$ref": "pageInfoText"
      },
      "roomIdInput": {
        "_$ref": "roomIdInput"
      },
      "joinByIdBtn": {
        "_$ref": "joinByIdBtn"
      },
      "quickMatchBtn": {
        "_$ref": "zpx413tx"
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
          "_$id": "luwxi4ar",
          "_$type": "Box",
          "name": "Box",
          "x": -282,
          "width": 1164,
          "height": 200,
          "mouseThrough": true,
          "centerX": 0,
          "_$child": [
            {
              "_$id": "title",
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
              "_$id": "g8vig7v6",
              "_$type": "Box",
              "name": "Box_2",
              "x": 287,
              "y": -410,
              "width": 591,
              "height": 200,
              "centerX": 0,
              "_$child": [
                {
                  "_$id": "refreshBtn",
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
                  "_$id": "zpx413tx",
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
                  "_$id": "uxy98uk7",
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
                  "_$id": "statusText",
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
              "_$id": "fkkb6d54",
              "_$type": "Box",
              "name": "Box_1",
              "x": 282,
              "width": 600,
              "height": 200,
              "centerX": 0,
              "_$child": [
                {
                  "_$id": "prevPageBtn",
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
                  "_$id": "pageInfoText",
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
                  "_$id": "nextPageBtn",
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
              "_$id": "hy07mynq",
              "_$type": "Box",
              "name": "Box",
              "x": 284,
              "width": 596,
              "height": 200,
              "centerX": 0,
              "_$child": [
                {
                  "_$id": "roomIdInput",
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
                  "_$id": "joinByIdBtn",
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
        },
        {
          "_$id": "24bxquar",
          "_$var": true,
          "_$type": "List",
          "name": "List",
          "x": -66,
          "y": -1060,
          "width": 732,
          "height": 997,
          "centerX": 0,
          "itemTemplate": {
            "_$ref": "hzsj3hcv",
            "_$tmpl": "itemRender"
          },
          "repeatX": 2,
          "repeatY": 5,
          "_$child": [
            {
              "_$id": "hzsj3hcv",
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
                  "color": "#ffffff"
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
                  "color": "#ffffff"
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
                  "color": "#ffffff"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}