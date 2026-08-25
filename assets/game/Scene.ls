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
          "scriptPath": "../src/NewScript.ts",
          "linyueru": null,
          "courtNet": {
            "_$ref": [
              "r0hs7t69",
              "#43"
            ]
          },
          "courtFloor": null,
          "ball": {
            "_$ref": [
              "l0ch2aq1",
              "#40"
            ]
          },
          "p1": {
            "_$ref": "xg8b5p48"
          },
          "p2": null,
          "p3": null,
          "p4": null,
          "camera": null
        }
      ],
      "_$child": [
        {
          "_$id": "r0hs7t69",
          "_$prefab": "0d67e488-b658-427f-a24e-9add580694fa",
          "name": "court",
          "active": true,
          "layer": 0,
          "transform": {
            "localPosition": {
              "_$type": "Vector3"
            },
            "localRotation": {
              "_$type": "Quaternion"
            },
            "localScale": {
              "_$type": "Vector3",
              "x": 1,
              "y": 1,
              "z": 1
            }
          },
          "_$child": [
            {
              "_$override": "#43",
              "_$comp": [
                {
                  "_$type": "PhysicsCollider",
                  "colliderShape": {
                    "_$type": "MeshColliderShape",
                    "mesh": {
                      "_$uuid": "0d67e488-b658-427f-a24e-9add580694fa@lm1",
                      "_$type": "Mesh"
                    }
                  },
                  "collisionGroup": 1,
                  "canCollideWith": -1,
                  "isTrigger": true
                }
              ]
            }
          ]
        },
        {
          "_$id": "l0ch2aq1",
          "_$prefab": "38e3fc6b-3dc3-4b81-9d1c-d4eb09857961",
          "name": "ball",
          "active": true,
          "layer": 0,
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "x": 2.84,
              "y": 0.9,
              "z": 1.03
            },
            "localRotation": {
              "_$type": "Quaternion",
              "x": 8.652363547856368e-10,
              "y": -3.240418600114481e-9,
              "z": -5.779699829844275e-9
            },
            "localScale": {
              "_$type": "Vector3",
              "x": 0.9999999403953632,
              "y": 1.0000000000000406,
              "z": 1
            }
          },
          "_$child": [
            {
              "_$override": "#40",
              "transform": {
                "localPosition": {
                  "_$type": "Vector3"
                }
              }
            }
          ]
        },
        {
          "_$id": "xg8b5p48",
          "_$prefab": "23bd3f5b-70be-4f08-858a-e143ffef01cb",
          "name": "cha",
          "active": true,
          "layer": 0,
          "transform": {
            "localPosition": {
              "_$type": "Vector3",
              "x": -1.8378543435773513,
              "y": 1.409519650279399,
              "z": -1.1343686935879886
            },
            "localRotation": {
              "_$type": "Quaternion",
              "x": 0.008726411513887955,
              "y": -0.005235768825257317,
              "z": 0.000045691839473905984,
              "w": 0.9999482158487781
            }
          },
          "_$comp": [
            {
              "_$override": "Animator",
              "controller": {
                "_$uuid": "25372f81-5a20-4b5f-b543-d09eea7755e3",
                "_$type": "AnimationController"
              }
            }
          ],
          "_$child": [
            {
              "_$id": "j2v1nzpp",
              "_$type": "Camera",
              "name": "Camera",
              "transform": {
                "localPosition": {
                  "_$type": "Vector3",
                  "x": 1.3911605423189144e-8,
                  "y": 1.4539402044658694,
                  "z": -2.0320624764923356
                },
                "localRotation": {
                  "_$type": "Quaternion",
                  "x": -4.9426000429506514e-17,
                  "y": -0.9952273953833443,
                  "z": -0.09758294665813569,
                  "w": 2.840608190279863e-16
                },
                "localScale": {
                  "_$type": "Vector3",
                  "x": 1,
                  "y": 0.9999999767174294,
                  "z": 0.9999999767174294
                }
              },
              "fieldOfView": 59,
              "nearPlane": 0.3,
              "farPlane": 1000,
              "clearColor": {
                "_$type": "Color",
                "r": 0.39215686274509803,
                "g": 0.5843137254901961,
                "b": 0.9294117647058824
              }
            }
          ]
        },
        {
          "_$id": "4r2ntxc4",
          "_$type": "Camera",
          "name": "CameraS_L",
          "active": false,
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
    },
    {
      "_$id": "p0y82w4j",
      "_$type": "Area2D",
      "name": "Area2D",
      "x": 274,
      "y": 1254,
      "width": 600,
      "height": 400,
      "mouseThrough": true,
      "_$child": [
        {
          "_$id": "9zszqk13",
          "_$type": "Sprite",
          "name": "playerICN",
          "x": -222,
          "y": -990,
          "width": 188,
          "height": 176,
          "texture": {
            "_$uuid": "6c23c2cf-9faf-43bc-89cc-12cf97f2d2a9",
            "_$type": "Texture"
          }
        },
        {
          "_$id": "7dhiwgti",
          "_$type": "Text",
          "name": "player",
          "x": -4,
          "y": -972,
          "width": 172,
          "height": 76,
          "text": "玩家：",
          "fontSize": 66,
          "color": "#ffffff",
          "leading": 2,
          "letterSpacing": 0
        },
        {
          "_$id": "oa5emdfy",
          "_$type": "Camera2D",
          "name": "Camera2D",
          "x": 272,
          "y": -10,
          "width": 968,
          "height": 1408,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "isMain": true,
          "positionSpeed": null
        },
        {
          "_$id": "vxohe26u",
          "_$type": "Sprite",
          "name": "Sprite",
          "x": 286,
          "y": -252,
          "width": 200,
          "height": 50,
          "anchorX": 0.5,
          "anchorY": 0.5,
          "visible": false,
          "_gcmds": [
            {
              "_$type": "DrawPolyCmd",
              "x": 0,
              "y": 0,
              "points": [
                100,
                0,
                200,
                25,
                100,
                50,
                0,
                25,
                0,
                25
              ],
              "lineWidth": 1,
              "lineColor": "#000000",
              "fillColor": "#ffffff"
            }
          ]
        },
        {
          "_$id": "xhcvryoq",
          "_$type": "Text",
          "name": "CountDown",
          "x": 160,
          "y": -537,
          "width": 296,
          "height": 112,
          "visible": false,
          "text": "倒计时",
          "fontSize": 86,
          "color": "#ffffff",
          "leading": 2,
          "letterSpacing": 0
        },
        {
          "_$id": "le8l2bgv",
          "_$prefab": "b4521a63-ee87-4b39-8324-d1c29b403467",
          "name": "ProgressBar",
          "active": true,
          "x": -84,
          "y": 19,
          "width": 728,
          "height": 74,
          "visible": true,
          "value": 33,
          "_$child": [
            {
              "_$override": "k3702cls",
              "src": "res://f9f5a35b-0440-43a8-ab59-0f3a17d67467",
              "autoSize": false,
              "background": null,
              "y": 0,
              "x": 0
            },
            {
              "_$id": "93p2gjnq",
              "_$type": "Sprite",
              "name": "Sprite_1",
              "x": 384,
              "y": -15,
              "width": 976,
              "height": 1082,
              "anchorX": 0.5,
              "anchorY": 0.5,
              "zIndex": -1,
              "_gcmds": [
                {
                  "_$type": "DrawRectCmd",
                  "fillColor": "#bbbb9d"
                }
              ]
            }
          ]
        },
        {
          "_$id": "z8dbu6pu",
          "_$type": "Text",
          "name": "show",
          "x": -84,
          "y": 128,
          "width": 708,
          "height": 112,
          "text": "loading...",
          "fontSize": 50,
          "color": "#ffffff",
          "leading": 2,
          "letterSpacing": 0
        },
        {
          "_$id": "hvnfhuhl",
          "_$type": "Text",
          "name": "gameShow",
          "x": 26,
          "y": -872,
          "width": 561,
          "height": 165,
          "zIndex": 11,
          "text": "资源加载",
          "fontSize": 93,
          "color": "#ffffff",
          "align": "center",
          "valign": "middle",
          "leading": 2,
          "letterSpacing": 0
        }
      ]
    }
  ]
}