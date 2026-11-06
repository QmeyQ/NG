{
  "_$ver": 1,
  "_$id": "scensze8",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "Scene2D",
  "width": 1170,
  "height": 2532,
  "_$child": [
    {
      "_$id": "s7vzuk8y",
      "_$type": "Scene3D",
      "name": "Scene3D",
      "skyRenderer": {
        "meshType": "dome"
      },
      "ambientColor": {
        "_$type": "Color",
        "r": 0.212,
        "g": 0.227,
        "b": 0.259
      },
      "_$comp": [
        {
          "_$type": "e8a95ca0-651f-48bc-b47e-0f93d6b7f3c3",
          "enabled": false,
          "scriptPath": "../src/badm.ts",
          "linyueru": null,
          "courtNet": {
            "_$ref": [
              "r0hs7t69",
              "#43"
            ]
          },
          "courtFloor": null,
          "ball": null,
          "p1": {
            "_$ref": "7c382671"
          },
          "p2": null,
          "p3": null,
          "p4": null,
          "camera": null
        }
      ],
      "_$child": [
        {
          "_$id": "4r2ntxc4",
          "_$type": "Camera",
          "name": "CameraS_L",
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "x": -4.251892427831922,
              "y": 5.924413468541296,
              "z": 0.2186459391317552
            },
            "localRotation": {
              "_$type": "Quaternion",
              "x": -0.3933605112852851,
              "y": -0.5875946801676978,
              "z": -0.39336051128528504,
              "w": 0.5875946801676978
            },
            "localScale": {
              "_$type": "Vector3",
              "x": 0.9999999944534975,
              "y": 0.9999999837393547,
              "z": 0.9999999926688774
            }
          },
          "fieldOfView": 90,
          "nearPlane": 0.3,
          "farPlane": 1000,
          "clearColor": {
            "_$type": "Color",
            "r": 0.39215686274509803,
            "g": 0.5843137254901961,
            "b": 0.9294117647058824
          }
        },
        {
          "_$id": "4qypnpy4",
          "_$type": "Camera",
          "name": "CameraS_R",
          "active": false,
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "x": 4.1618924,
              "y": 5.924413468541296,
              "z": 0.2186459391317552
            },
            "localRotation": {
              "_$type": "Quaternion",
              "x": -0.39336051128528526,
              "y": 0.5875946801676977,
              "z": 0.3933605112852852,
              "w": 0.5875946801676978
            },
            "localScale": {
              "_$type": "Vector3",
              "x": 0.9999999944534975,
              "y": 0.9999999837393547,
              "z": 0.9999999926688774
            }
          },
          "fieldOfView": 90,
          "nearPlane": 0.3,
          "farPlane": 1000,
          "clearColor": {
            "_$type": "Color",
            "r": 0.39215686274509803,
            "g": 0.5843137254901961,
            "b": 0.9294117647058824
          }
        },
        {
          "_$id": "pfepj8fe",
          "_$type": "Sprite3D",
          "name": "PointLight",
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "x": 4.306093693017516,
              "y": 1.555390390610496,
              "z": 2.189353765049498
            }
          },
          "_$comp": [
            {
              "_$type": "PointLightCom",
              "lightmapBakedType": 0,
              "range": 8.888073792268383,
              "power": 10,
              "radius": 51.36,
              "maxBounces": 1024
            }
          ]
        },
        {
          "_$id": "31iy01qk",
          "_$type": "Sprite3D",
          "name": "PointLight_1",
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "x": -4.863417522279714,
              "y": 1.555390390610496,
              "z": 2.189353765049498
            }
          },
          "_$comp": [
            {
              "_$type": "PointLightCom",
              "lightmapBakedType": 0,
              "range": 8.888073792268383,
              "power": 10,
              "radius": 51.36,
              "maxBounces": 1024
            }
          ]
        },
        {
          "_$id": "au41iqgs",
          "_$type": "Sprite3D",
          "name": "PointLight_2",
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "x": -2.4511836764754356,
              "y": 1.555390390610496,
              "z": -9.065824417869075
            }
          },
          "_$comp": [
            {
              "_$type": "PointLightCom",
              "lightmapBakedType": 0,
              "range": 8.888073792268383,
              "power": 10,
              "radius": 51.36,
              "maxBounces": 1024
            }
          ]
        },
        {
          "_$id": "8x5q2agm",
          "_$type": "Sprite3D",
          "name": "DirectionLight",
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "x": 1.507561336174317,
              "y": -0.22383899516283678,
              "z": -5.87235834029403
            },
            "localRotation": {
              "_$type": "Quaternion",
              "x": -0.6959282518474325,
              "y": -0.030046577382845868,
              "z": -0.029168047985401194,
              "w": 0.7168893195221104
            }
          },
          "_$comp": [
            {
              "_$type": "DirectionLightCom",
              "intensity": 0.32,
              "lightmapBakedType": 0,
              "strength": 1.273,
              "angle": 44.788,
              "maxBounces": 1024
            }
          ]
        }
      ]
    }
  ]
}