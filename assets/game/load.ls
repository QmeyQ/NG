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
      "roomList": null,
      "createRoomBtn": null,
      "refreshBtn": null,
      "statusText": null,
      "prevPageBtn": null,
      "nextPageBtn": null,
      "pageInfoText": null,
      "roomIdInput": null,
      "joinByIdBtn": null,
      "quickMatchBtn": null
    }
  ],
  "_$child": [
    {
      "_$id": "roomPanel",
      "_$type": "Area2D",
      "name": "roomPanel",
      "x": -2,
      "y": 5,
      "width": 1170,
      "height": 2532,
      "_$child": [
        {
          "_$id": "title",
          "_$type": "Text",
          "name": "title",
          "x": 378,
          "y": 44,
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
          "_$id": "roomList",
          "_$type": "List",
          "name": "roomList",
          "x": 285,
          "y": 250,
          "width": 600,
          "height": 1000,
          "centerX": 0,
          "repeatX": 1,
          "repeatY": 1,
          "_$child": [
            {
              "_$id": "hzsj3hcv",
              "_$type": "Box",
              "name": "Box",
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
        },
        {
          "_$id": "createRoomBtn",
          "_$type": "Button",
          "name": "createRoomBtn",
          "x": 587,
          "y": 1488,
          "width": 300,
          "height": 80,
          "skin": "",
          "label": "创建房间",
          "labelColors": "#ffffff,#ffffff,#ffffff",
          "labelAlign": "center",
          "labelVAlign": "middle"
        },
        {
          "_$id": "refreshBtn",
          "_$type": "Button",
          "name": "refreshBtn",
          "x": 276,
          "y": 1486,
          "width": 300,
          "height": 80,
          "skin": "",
          "label": "刷新列表",
          "labelColors": "#ffffff,#ffffff,#ffffff",
          "labelAlign": "center",
          "labelVAlign": "middle"
        },
        {
          "_$id": "statusText",
          "_$type": "Text",
          "name": "statusText",
          "x": 385,
          "y": 137,
          "width": 400,
          "height": 100,
          "text": "正在连接服务器...",
          "fontSize": 32,
          "color": "#ffff00",
          "align": "center",
          "valign": "middle",
          "leading": 2
        },
        {
          "_$id": "pagePanel",
          "_$type": "Area2D",
          "name": "pagePanel",
          "x": 284,
          "y": 1301,
          "width": 600,
          "height": 80,
          "_$child": [
            {
              "_$id": "prevPageBtn",
              "_$type": "Button",
              "name": "prevPageBtn",
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
              "_$type": "Text",
              "name": "pageInfoText",
              "x": 200,
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
              "_$type": "Button",
              "name": "nextPageBtn",
              "x": 400,
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
          "_$id": "quickMatchBtn",
          "_$type": "Button",
          "name": "quickMatchBtn",
          "x": 420,
          "y": 1625,
          "width": 300,
          "height": 80,
          "skin": "",
          "label": "一键匹配",
          "labelColors": "#ffffff,#ffffff,#ffffff",
          "labelAlign": "center",
          "labelVAlign": "middle"
        },
        {
          "_$id": "joinByIdPanel",
          "_$type": "Area2D",
          "name": "joinByIdPanel",
          "x": 287,
          "y": 1720,
          "width": 600,
          "height": 100,
          "_$child": [
            {
              "_$id": "roomIdInput",
              "_$type": "TextInput",
              "name": "roomIdInput",
              "x": 2,
              "y": 10,
              "width": 400,
              "height": 80,
              "centerY": 0,
              "text": "",
              "fontSize": 32,
              "bgColor": "#ffffff",
              "padding": "1,1,1,3",
              "prompt": "输入房间ID",
              "promptColor": "#888888"
            },
            {
              "_$id": "joinByIdBtn",
              "_$type": "Button",
              "name": "joinByIdBtn",
              "x": 422,
              "y": 10,
              "width": 190,
              "height": 80,
              "centerY": 0,
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