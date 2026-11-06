"use strict";
var gui = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    AlignNames: () => AlignNames,
    AlignType: () => AlignType,
    AssetDb: () => AssetDb,
    BatchProgress: () => BatchProgress,
    Box: () => Box,
    Button: () => Button,
    ButtonDownEffect: () => ButtonDownEffect,
    ButtonMode: () => ButtonMode,
    ButtonPageAlternatives: () => ButtonPageAlternatives,
    ButtonStatus: () => ButtonStatus,
    ChildrenRenderOrder: () => ChildrenRenderOrder,
    ClassUtils: () => ClassUtils,
    Color: () => Color,
    ComboBox: () => ComboBox,
    Component: () => Component,
    ComponentDriver: () => ComponentDriver,
    Controller: () => Controller,
    ControllerRef: () => ControllerRef,
    CurveType: () => CurveType,
    Delegate: () => Delegate,
    Downloader: () => Downloader,
    DragSupport: () => DragSupport,
    EaseType: () => EaseType,
    Event: () => Event,
    EventDispatcher: () => EventDispatcher,
    EventPool: () => EventPool,
    GPath: () => GPath,
    GRoot: () => GRoot,
    Gear: () => Gear,
    GearBool: () => GearBool,
    GearColor: () => GearColor,
    GearDisplay: () => GearDisplay,
    GearHexColor: () => GearHexColor,
    GearNumber: () => GearNumber,
    GearString: () => GearString,
    GearTweenConfig: () => GearTweenConfig,
    HideFlags: () => HideFlags,
    Image: () => Image2,
    InputInfo: () => InputInfo,
    InputManager: () => InputManager,
    Label: () => Label,
    Layout: () => Layout,
    LayoutChangedReason: () => LayoutChangedReason,
    LayoutType: () => LayoutType,
    List: () => List,
    ListLayout: () => ListLayout,
    ListSelection: () => ListSelection,
    Loader: () => Loader,
    LoaderFitMode: () => LoaderFitMode,
    NodeFlags: () => NodeFlags,
    Panel: () => Panel,
    PathPoint: () => PathPoint,
    Pool: () => Pool,
    PopupDirection: () => PopupDirection,
    PopupManager: () => PopupManager,
    PopupMenu: () => PopupMenu,
    Prefab: () => Prefab,
    PrefabLoader: () => PrefabLoader,
    PrefabParser: () => PrefabParser,
    ProgressBar: () => ProgressBar,
    ProgressTitleType: () => ProgressTitleType,
    Rect: () => Rect,
    Relation: () => Relation,
    RelationType: () => RelationType,
    Resource: () => Resource,
    ResourceManager: () => ResourceManager,
    SEllipse: () => SEllipse,
    SGraphics: () => SGraphics,
    SImage: () => SImage,
    SLine: () => SLine,
    SRect: () => SRect,
    ScrollBar: () => ScrollBar,
    ScrollBarDisplay: () => ScrollBarDisplay,
    ScrollBounceBackEffect: () => ScrollBounceBackEffect,
    ScrollDirection: () => ScrollDirection,
    ScrollTouchEffect: () => ScrollTouchEffect,
    Scroller: () => Scroller,
    Selection: () => Selection,
    SelectionMode: () => SelectionMode,
    SerializeUtil: () => SerializeUtil,
    Shape: () => Shape,
    Slider: () => Slider,
    StretchMode: () => StretchMode,
    StretchParam: () => StretchParam,
    TextAutoSize: () => TextAutoSize,
    TextField: () => TextField,
    TextInput: () => TextInput,
    TextStyle: () => TextStyle,
    Texture: () => Texture,
    TextureLoader: () => TextureLoader,
    Timers: () => Timers,
    Translations: () => Translations,
    TranslationsLoader: () => TranslationsLoader,
    Tree: () => Tree,
    TreeClickToExpandType: () => TreeClickToExpandType,
    TreeNode: () => TreeNode,
    TreeSelection: () => TreeSelection,
    Tween: () => Tween,
    TweenManager: () => TweenManager,
    TweenValue: () => TweenValue,
    Tweener: () => Tweener,
    TypedArrayClasses: () => TypedArrayClasses,
    UBBParser: () => UBBParser,
    UIConfig: () => UIConfig,
    UIElement: () => UIElement,
    UIPackage: () => UIPackage,
    UIPackageImpl: () => UIPackageImpl,
    VAlignNames: () => VAlignNames,
    VAlignType: () => VAlignType,
    Vec2: () => Vec2,
    Widget: () => Widget,
    WidgetPool: () => WidgetPool,
    WidgetRef: () => WidgetRef,
    Window: () => Window,
    XML: () => XML,
    XMLIterator: () => XMLIterator,
    XMLTagType: () => XMLTagType,
    XMLUtils: () => XMLUtils,
    clamp: () => clamp,
    clamp01: () => clamp01,
    decorator: () => decorator,
    defaultInputPadding: () => defaultInputPadding,
    distance: () => distance,
    evaluateEase: () => evaluateEase,
    getBaseName: () => getBaseName,
    getFileExtension: () => getFileExtension,
    getPath: () => getPath,
    getResURLByUUID: () => getResURLByUUID,
    hookSetter: () => hookSetter,
    hookSetterAsync: () => hookSetterAsync,
    joinURL: () => joinURL,
    lerp: () => lerp,
    normalizeURL: () => normalizeURL,
    repeat: () => repeat,
    replaceFileExtension: () => replaceFileExtension,
    setInstance: () => setInstance
  });

  // src/UIPackage.ts
  var UIPackage;
  function setInstance(inst) {
    UIPackage = inst;
  }

  // src/math/Color.ts
  var _Color = class _Color {
    static hexToString(rgb) {
      tmpColor.parse(rgb);
      return tmpColor.toString();
    }
    static stringToHex(str) {
      tmpColor.parse(str);
      return tmpColor.getHex();
    }
    constructor(r2, g, b, a) {
      if (r2 != null && typeof r2 === "string")
        this.parse(r2);
      else {
        this.r = r2 ?? 1;
        this.g = g ?? 1;
        this.b = b ?? 1;
        this.a = a ?? 1;
      }
    }
    copy(source) {
      this.r = source.r;
      this.g = source.g;
      this.b = source.b;
      this.a = source.a;
      return this;
    }
    clone() {
      return new _Color().copy(this);
    }
    getHex() {
      return (Math.round(this.r * 255) << 16) + (Math.round(this.g * 255) << 8) + Math.round(this.b * 255);
    }
    toString() {
      return "#" + ("000000" + this.getHex().toString(16)).slice(-6);
    }
    getStyleString() {
      if (this.a == 1)
        return this.toString();
      else
        return "rgba(" + Math.round(this.r * 255) + "," + Math.round(this.g * 255) + "," + Math.round(this.b * 255) + "," + this.a + ")";
    }
    parse(src) {
      if (src == null)
        src = 0;
      if (typeof src === "number") {
        this.r = (src >> 16 & 255) / 255;
        this.g = (src >> 8 & 255) / 255;
        this.b = (src & 255) / 255;
        this.a = 1;
      } else if (src.startsWith("rgba(")) {
        let arr = src.substring(5, src.length - 1).split(",");
        this.r = parseFloat(arr[0]) / 255;
        this.g = parseFloat(arr[1]) / 255;
        this.b = parseFloat(arr[2]) / 255;
        this.a = parseFloat(arr[3]);
      } else {
        if (src.length < 1) {
          this.r = this.g = this.b = this.a = 1;
          return;
        }
        if (src.charAt(0) == "#")
          src = src.substring(1);
        let rgb;
        let a = 255;
        if (src.length == 8) {
          a = parseInt(src.substring(0, 2), 16);
          rgb = parseInt(src.substring(2), 16);
        } else
          rgb = parseInt(src, 16);
        this.r = (rgb >> 16 & 255) / 255;
        this.g = (rgb >> 8 & 255) / 255;
        this.b = (rgb & 255) / 255;
        this.a = a / 255;
      }
    }
  };
  _Color.CLEAR = new _Color(0, 0, 0, 0);
  _Color.RED = new _Color(1, 0, 0, 1);
  _Color.GREEN = new _Color(0, 1, 0, 1);
  _Color.BLUE = new _Color(0, 0, 1, 1);
  _Color.YELLOW = new _Color(1, 1, 0, 1);
  _Color.GRAY = new _Color(0.5, 0.5, 0.5, 1);
  _Color.BLACK = new _Color(0, 0, 0, 1);
  _Color.WHITE = new _Color(1, 1, 1, 1);
  var Color = _Color;
  var tmpColor = new Color();

  // src/ui/Const.ts
  var NodeFlags = class {
  };
  NodeFlags.ON_STAGE = 1;
  NodeFlags.ACTIVE_INHIERARCHY = 2;
  NodeFlags.AWAKED = 16;
  NodeFlags.ENABLED = 32;
  NodeFlags.OBSOLUTE = 128;
  NodeFlags.ALWASY_EMIT_MOUSE_MOVE_EVENT = 256;
  NodeFlags.ESCAPE_LAYOUT = 4096;
  NodeFlags.DISABLE_CLIPPING = 8192;
  NodeFlags.FORCE_HIDDEN = 16384;
  NodeFlags.FORCE_VISIBLE = 32768;
  NodeFlags.EDITING_NODE = 65536;
  NodeFlags.HIDE_BY_EDITOR = 131072;
  NodeFlags.LOCK_BY_EDITOR = 262144;
  NodeFlags.EDITING_ROOT_NODE = 524288;
  var HideFlags = class {
  };
  HideFlags.HideInHierarchy = 1;
  HideFlags.HideInInspector = 2;
  HideFlags.DontSave = 4;
  HideFlags.HideAndDontSave = 7;
  var ButtonStatus = /* @__PURE__ */ ((ButtonStatus2) => {
    ButtonStatus2[ButtonStatus2["Up"] = 0] = "Up";
    ButtonStatus2[ButtonStatus2["Down"] = 1] = "Down";
    ButtonStatus2[ButtonStatus2["Over"] = 2] = "Over";
    ButtonStatus2[ButtonStatus2["SelectedOver"] = 3] = "SelectedOver";
    ButtonStatus2[ButtonStatus2["Disabled"] = 4] = "Disabled";
    ButtonStatus2[ButtonStatus2["SelectedDisabled"] = 5] = "SelectedDisabled";
    return ButtonStatus2;
  })(ButtonStatus || {});
  var AlignType = /* @__PURE__ */ ((AlignType3) => {
    AlignType3[AlignType3["Left"] = 0] = "Left";
    AlignType3[AlignType3["Center"] = 1] = "Center";
    AlignType3[AlignType3["Right"] = 2] = "Right";
    AlignType3[AlignType3["None"] = 3] = "None";
    return AlignType3;
  })(AlignType || {});
  var VAlignType = /* @__PURE__ */ ((VAlignType3) => {
    VAlignType3[VAlignType3["Top"] = 0] = "Top";
    VAlignType3[VAlignType3["Middle"] = 1] = "Middle";
    VAlignType3[VAlignType3["Bottom"] = 2] = "Bottom";
    VAlignType3[VAlignType3["None"] = 3] = "None";
    return VAlignType3;
  })(VAlignType || {});
  var LayoutChangedReason = /* @__PURE__ */ ((LayoutChangedReason3) => {
    LayoutChangedReason3[LayoutChangedReason3["Size"] = 0] = "Size";
    LayoutChangedReason3[LayoutChangedReason3["Pos"] = 1] = "Pos";
    LayoutChangedReason3[LayoutChangedReason3["Visible"] = 2] = "Visible";
    LayoutChangedReason3[LayoutChangedReason3["Hierarchy"] = 3] = "Hierarchy";
    return LayoutChangedReason3;
  })(LayoutChangedReason || {});
  var ButtonMode = /* @__PURE__ */ ((ButtonMode2) => {
    ButtonMode2[ButtonMode2["Common"] = 0] = "Common";
    ButtonMode2[ButtonMode2["Check"] = 1] = "Check";
    ButtonMode2[ButtonMode2["Radio"] = 2] = "Radio";
    return ButtonMode2;
  })(ButtonMode || {});
  var ButtonDownEffect = /* @__PURE__ */ ((ButtonDownEffect2) => {
    ButtonDownEffect2[ButtonDownEffect2["None"] = 0] = "None";
    ButtonDownEffect2[ButtonDownEffect2["Dark"] = 1] = "Dark";
    ButtonDownEffect2[ButtonDownEffect2["UpScale"] = 2] = "UpScale";
    ButtonDownEffect2[ButtonDownEffect2["DownScale"] = 3] = "DownScale";
    return ButtonDownEffect2;
  })(ButtonDownEffect || {});
  var TextAutoSize = /* @__PURE__ */ ((TextAutoSize2) => {
    TextAutoSize2[TextAutoSize2["None"] = 0] = "None";
    TextAutoSize2[TextAutoSize2["Both"] = 1] = "Both";
    TextAutoSize2[TextAutoSize2["Height"] = 2] = "Height";
    TextAutoSize2[TextAutoSize2["Shrink"] = 3] = "Shrink";
    TextAutoSize2[TextAutoSize2["Ellipsis"] = 4] = "Ellipsis";
    return TextAutoSize2;
  })(TextAutoSize || {});
  var LayoutType = /* @__PURE__ */ ((LayoutType2) => {
    LayoutType2[LayoutType2["None"] = 0] = "None";
    LayoutType2[LayoutType2["SingleColumn"] = 1] = "SingleColumn";
    LayoutType2[LayoutType2["SingleRow"] = 2] = "SingleRow";
    LayoutType2[LayoutType2["FlowX"] = 3] = "FlowX";
    LayoutType2[LayoutType2["FlowY"] = 4] = "FlowY";
    return LayoutType2;
  })(LayoutType || {});
  var StretchMode = /* @__PURE__ */ ((StretchMode2) => {
    StretchMode2[StretchMode2["None"] = 0] = "None";
    StretchMode2[StretchMode2["Stretch"] = 1] = "Stretch";
    StretchMode2[StretchMode2["ResizeToFit"] = 2] = "ResizeToFit";
    return StretchMode2;
  })(StretchMode || {});
  var SelectionMode = /* @__PURE__ */ ((SelectionMode3) => {
    SelectionMode3[SelectionMode3["None"] = 0] = "None";
    SelectionMode3[SelectionMode3["Single"] = 1] = "Single";
    SelectionMode3[SelectionMode3["Multiple"] = 2] = "Multiple";
    SelectionMode3[SelectionMode3["MultipleBySingleClick"] = 3] = "MultipleBySingleClick";
    SelectionMode3[SelectionMode3["Disabled"] = 4] = "Disabled";
    return SelectionMode3;
  })(SelectionMode || {});
  var LoaderFitMode = /* @__PURE__ */ ((LoaderFitMode2) => {
    LoaderFitMode2[LoaderFitMode2["None"] = 0] = "None";
    LoaderFitMode2[LoaderFitMode2["Fill"] = 1] = "Fill";
    LoaderFitMode2[LoaderFitMode2["Contain"] = 2] = "Contain";
    LoaderFitMode2[LoaderFitMode2["Cover"] = 3] = "Cover";
    LoaderFitMode2[LoaderFitMode2["CoverWidth"] = 4] = "CoverWidth";
    LoaderFitMode2[LoaderFitMode2["CoverHeight"] = 5] = "CoverHeight";
    return LoaderFitMode2;
  })(LoaderFitMode || {});
  var ProgressTitleType = /* @__PURE__ */ ((ProgressTitleType2) => {
    ProgressTitleType2[ProgressTitleType2["Percent"] = 0] = "Percent";
    ProgressTitleType2[ProgressTitleType2["ValueAndMax"] = 1] = "ValueAndMax";
    ProgressTitleType2[ProgressTitleType2["Value"] = 2] = "Value";
    ProgressTitleType2[ProgressTitleType2["Max"] = 3] = "Max";
    return ProgressTitleType2;
  })(ProgressTitleType || {});
  var ScrollDirection = /* @__PURE__ */ ((ScrollDirection2) => {
    ScrollDirection2[ScrollDirection2["Vertical"] = 0] = "Vertical";
    ScrollDirection2[ScrollDirection2["Horizontal"] = 1] = "Horizontal";
    ScrollDirection2[ScrollDirection2["Both"] = 2] = "Both";
    return ScrollDirection2;
  })(ScrollDirection || {});
  var ScrollTouchEffect = /* @__PURE__ */ ((ScrollTouchEffect2) => {
    ScrollTouchEffect2[ScrollTouchEffect2["Default"] = 0] = "Default";
    ScrollTouchEffect2[ScrollTouchEffect2["On"] = 1] = "On";
    ScrollTouchEffect2[ScrollTouchEffect2["Off"] = 2] = "Off";
    return ScrollTouchEffect2;
  })(ScrollTouchEffect || {});
  var ScrollBounceBackEffect = /* @__PURE__ */ ((ScrollBounceBackEffect2) => {
    ScrollBounceBackEffect2[ScrollBounceBackEffect2["Default"] = 0] = "Default";
    ScrollBounceBackEffect2[ScrollBounceBackEffect2["On"] = 1] = "On";
    ScrollBounceBackEffect2[ScrollBounceBackEffect2["Off"] = 2] = "Off";
    return ScrollBounceBackEffect2;
  })(ScrollBounceBackEffect || {});
  var ScrollBarDisplay = /* @__PURE__ */ ((ScrollBarDisplay2) => {
    ScrollBarDisplay2[ScrollBarDisplay2["Default"] = 0] = "Default";
    ScrollBarDisplay2[ScrollBarDisplay2["Always"] = 1] = "Always";
    ScrollBarDisplay2[ScrollBarDisplay2["OnOverflow"] = 2] = "OnOverflow";
    ScrollBarDisplay2[ScrollBarDisplay2["OnScroll"] = 3] = "OnScroll";
    ScrollBarDisplay2[ScrollBarDisplay2["OnOverflowAndScroll"] = 4] = "OnOverflowAndScroll";
    ScrollBarDisplay2[ScrollBarDisplay2["Hidden"] = 5] = "Hidden";
    return ScrollBarDisplay2;
  })(ScrollBarDisplay || {});
  var ChildrenRenderOrder = /* @__PURE__ */ ((ChildrenRenderOrder2) => {
    ChildrenRenderOrder2[ChildrenRenderOrder2["Ascent"] = 0] = "Ascent";
    ChildrenRenderOrder2[ChildrenRenderOrder2["Descent"] = 1] = "Descent";
    ChildrenRenderOrder2[ChildrenRenderOrder2["Arch"] = 2] = "Arch";
    return ChildrenRenderOrder2;
  })(ChildrenRenderOrder || {});
  var PopupDirection = /* @__PURE__ */ ((PopupDirection5) => {
    PopupDirection5[PopupDirection5["Auto"] = 0] = "Auto";
    PopupDirection5[PopupDirection5["Up"] = 1] = "Up";
    PopupDirection5[PopupDirection5["Down"] = 2] = "Down";
    return PopupDirection5;
  })(PopupDirection || {});
  var TreeClickToExpandType = /* @__PURE__ */ ((TreeClickToExpandType3) => {
    TreeClickToExpandType3[TreeClickToExpandType3["None"] = 0] = "None";
    TreeClickToExpandType3[TreeClickToExpandType3["SingleClick"] = 1] = "SingleClick";
    TreeClickToExpandType3[TreeClickToExpandType3["DoubleClick"] = 2] = "DoubleClick";
    return TreeClickToExpandType3;
  })(TreeClickToExpandType || {});
  var RelationType = /* @__PURE__ */ ((RelationType2) => {
    RelationType2[RelationType2["Width"] = 1] = "Width";
    RelationType2[RelationType2["Height"] = 2] = "Height";
    RelationType2[RelationType2["Left_Left"] = 3] = "Left_Left";
    RelationType2[RelationType2["Left_Center"] = 4] = "Left_Center";
    RelationType2[RelationType2["Left_Right"] = 5] = "Left_Right";
    RelationType2[RelationType2["Center_Center"] = 6] = "Center_Center";
    RelationType2[RelationType2["Right_Left"] = 7] = "Right_Left";
    RelationType2[RelationType2["Right_Center"] = 8] = "Right_Center";
    RelationType2[RelationType2["Right_Right"] = 9] = "Right_Right";
    RelationType2[RelationType2["Top_Top"] = 10] = "Top_Top";
    RelationType2[RelationType2["Top_Middle"] = 11] = "Top_Middle";
    RelationType2[RelationType2["Top_Bottom"] = 12] = "Top_Bottom";
    RelationType2[RelationType2["Middle_Middle"] = 13] = "Middle_Middle";
    RelationType2[RelationType2["Bottom_Top"] = 14] = "Bottom_Top";
    RelationType2[RelationType2["Bottom_Middle"] = 15] = "Bottom_Middle";
    RelationType2[RelationType2["Bottom_Bottom"] = 16] = "Bottom_Bottom";
    RelationType2[RelationType2["LeftExt_Left"] = 17] = "LeftExt_Left";
    RelationType2[RelationType2["LeftExt_Right"] = 18] = "LeftExt_Right";
    RelationType2[RelationType2["RightExt_Left"] = 19] = "RightExt_Left";
    RelationType2[RelationType2["RightExt_Right"] = 20] = "RightExt_Right";
    RelationType2[RelationType2["TopExt_Top"] = 21] = "TopExt_Top";
    RelationType2[RelationType2["TopExt_Bottom"] = 22] = "TopExt_Bottom";
    RelationType2[RelationType2["BottomExt_Top"] = 23] = "BottomExt_Top";
    RelationType2[RelationType2["BottomExt_Bottom"] = 24] = "BottomExt_Bottom";
    RelationType2[RelationType2["Size"] = 100] = "Size";
    RelationType2[RelationType2["Pos"] = 101] = "Pos";
    RelationType2[RelationType2["CenterAndMiddle"] = 102] = "CenterAndMiddle";
    return RelationType2;
  })(RelationType || {});

  // src/UIConfig.ts
  var UIConfig = class {
  };
  //Default font name
  UIConfig.defaultFont = "";
  //When a modal window is in front, the background becomes dark.
  UIConfig.modalLayerColor = new Color(0.2, 0.2, 0.2, 0.2);
  //Default button click sound
  UIConfig.buttonSound = null;
  UIConfig.buttonSoundVolumeScale = 1;
  //Default button click sound
  UIConfig.horizontalScrollBar = null;
  UIConfig.verticalScrollBar = null;
  //Scrolling step in pixels
  UIConfig.defaultScrollStep = 25;
  //Deceleration ratio of scrollview when its in touch dragging.
  UIConfig.defaultScrollDecelerationRate = 0.967;
  //Default scrollbar display mode. Recommened visible for Desktop and Auto for mobile.
  UIConfig.defaultScrollBarDisplay = 1 /* Always */;
  //Allow dragging the content to scroll. Recommeded true for mobile.
  UIConfig.defaultScrollTouchEffect = true;
  //The "rebound" effect in the scolling container. Recommeded true for mobile.
  UIConfig.defaultScrollBounceEffect = true;
  /**
  * 当滚动容器设置为“贴近ITEM”时，判定贴近到哪一个ITEM的滚动距离阀值。
  */
  UIConfig.defaultScrollSnappingThreshold = 0.1;
  /**
  * 当滚动容器设置为“页面模式”时，判定翻到哪一页的滚动距离阀值。
  */
  UIConfig.defaultScrollPagingThreshold = 0.3;
  //Resources for PopupMenu.
  UIConfig.popupMenu = null;
  //Resources for tooltips.
  UIConfig.tooltipsWin = null;
  UIConfig.defaultTooltipsShowDelay = 100;
  //In milliseconds
  //Max items displayed in combobox without scrolling.
  UIConfig.defaultComboBoxVisibleItemCount = 20;
  // Pixel offsets of finger to trigger scrolling.
  UIConfig.touchScrollSensitivity = 20;
  // Pixel offsets of finger to trigger dragging.
  UIConfig.touchDragSensitivity = 10;
  // Pixel offsets of mouse pointer to trigger dragging.
  UIConfig.clickDragSensitivity = 2;
  // When click the window, brings to front automatically.
  UIConfig.bringWindowToFrontOnClick = true;
  UIConfig.frameTimeForAsyncUIConstruction = 2;
  UIConfig.defaultLinkClass = "ui-link";

  // src/core/ClassUtils.ts
  var _ClassUtils = class _ClassUtils {
    static regClass(name, cls) {
      _ClassUtils.classRegistry[name] = cls;
    }
    static getClass(name) {
      return _ClassUtils.classRegistry[name];
    }
    static regRuntime(url, cls) {
      _ClassUtils.runtimeRegistry[url] = cls;
    }
    static getRuntime(url) {
      return _ClassUtils.runtimeRegistry[url];
    }
  };
  _ClassUtils.classRegistry = {};
  _ClassUtils.runtimeRegistry = {};
  var ClassUtils = _ClassUtils;

  // src/Decorators.ts
  function dummy() {
  }
  var decorator = class {
    /**
     * 注册一个类型，注册后才能被序列化系统自动保存和载入。
     */
    static regClass(assetId) {
      return function(constructor) {
        ClassUtils.regClass(assetId, constructor);
      };
    }
    /**
     * 设置类型的额外信息。
     * @param info 类型的额外信息
     */
    static classInfo(info) {
      return dummy;
    }
    /**
     * 设置组件可以在编辑器环境中执行完整声明周期。
     */
    static runInEditor(constructor) {
    }
    /**
     * 使用这个装饰器，可以使属性显示在编辑器属性设置面板上，并且能序列化保存。
     * @param info 属性的类型，如: Number,"number",[Number],["Record", Number]等。或传递对象描述详细信息，例如{ type: "string", multiline: true }。
     */
    static property(info) {
      return dummy;
    }
  };

  // src/utils/UBBParser.ts
  var dummyOptions = {};
  var UBBParser = class _UBBParser {
    constructor() {
      this._readPos = 0;
      this._handlers = {
        "url": this.onTag_URL,
        "img": this.onTag_IMG,
        "b": this.onTag_B,
        "i": this.onTag_I,
        "u": this.onTag_U,
        "sup": this.onTag_Simple,
        "sub": this.onTag_Simple,
        "color": this.onTag_COLOR,
        "font": this.onTag_FONT,
        "size": this.onTag_SIZE
      };
    }
    static get inst() {
      return _UBBParser._inst ?? (_UBBParser._inst = new _UBBParser());
    }
    onTag_URL(tagName, end, attr) {
      if (!end) {
        if (attr == null)
          attr = this.getTagText();
        return "<a class='" + (this._options.linkClass || UIConfig.defaultLinkClass) + `' href="#" onclick="GRootInst.inputMgr.onClickLink(event, '` + attr + `');">`;
      } else
        return "</a>";
    }
    onTag_IMG(tagName, end, attr) {
      if (!end) {
        let src = this.getTagText(true);
        if (!src)
          return null;
        if (this._options.imageWidth)
          return '<img src="' + src + '" width="' + this._options.imageWidth + '" height="' + this._options.imageHeight + '"/>';
        else
          return '<img src="' + src + '"/>';
      } else
        return null;
    }
    onTag_B(tagName, end, attr) {
      return end ? "</b>" : "<b>";
    }
    onTag_I(tagName, end, attr) {
      return end ? "</i>" : "<i>";
    }
    onTag_U(tagName, end, attr) {
      return end ? "</u>" : "<u>";
    }
    onTag_Simple(tagName, end, attr) {
      return end ? "</" + tagName + ">" : "<" + tagName + ">";
    }
    onTag_COLOR(tagName, end, attr) {
      if (!end) {
        this.lastColor = attr;
        return '<span style="color:' + attr + '">';
      } else
        return "</span>";
    }
    onTag_FONT(tagName, end, attr) {
      if (!end)
        return '<span style="font-family:' + attr + '">';
      else
        return "</span>";
    }
    onTag_SIZE(tagName, end, attr) {
      if (!end) {
        this.lastSize = attr;
        return '<span style="font-size:' + attr + 'px">';
      } else
        return "</span>";
    }
    getTagText(remove) {
      let pos1 = this._readPos;
      let pos2;
      let result = "";
      while ((pos2 = this._text.indexOf("[", pos1)) != -1) {
        if (this._text.charCodeAt(pos2 - 1) == 92) {
          result += this._text.substring(pos1, pos2 - 1);
          result += "[";
          pos1 = pos2 + 1;
        } else {
          result += this._text.substring(pos1, pos2);
          break;
        }
      }
      if (pos2 == -1)
        return null;
      if (remove)
        this._readPos = pos2;
      return result;
    }
    parse(text, remove, options) {
      this._text = text;
      this.lastColor = null;
      this.lastSize = null;
      this._options = options || dummyOptions;
      let pos1 = 0, pos2, pos3;
      let end;
      let tag, attr;
      let repl;
      let func;
      let result = "";
      while ((pos2 = this._text.indexOf("[", pos1)) != -1) {
        if (pos2 > 0 && this._text.charCodeAt(pos2 - 1) == 92) {
          result += this._text.substring(pos1, pos2 - 1);
          result += "[";
          pos1 = pos2 + 1;
          continue;
        }
        result += this._text.substring(pos1, pos2);
        pos1 = pos2;
        pos2 = this._text.indexOf("]", pos1);
        if (pos2 == -1)
          break;
        end = this._text.charAt(pos1 + 1) == "/";
        tag = this._text.substring(end ? pos1 + 2 : pos1 + 1, pos2);
        this._readPos = pos2 + 1;
        attr = null;
        repl = null;
        pos3 = tag.indexOf("=");
        if (pos3 != -1) {
          attr = tag.substring(pos3 + 1);
          tag = tag.substring(0, pos3);
        }
        tag = tag.toLowerCase();
        func = this._handlers[tag];
        if (func != null) {
          if (!remove) {
            repl = func.call(this, tag, end, attr);
            if (repl != null)
              result += repl;
          }
        } else
          result += this._text.substring(pos1, this._readPos);
        pos1 = this._readPos;
      }
      if (pos1 < this._text.length)
        result += this._text.substring(pos1);
      this._text = null;
      return result;
    }
  };

  // src/utils/Pool.ts
  var Pool = class {
    constructor(type, init, reset) {
      this._init = init;
      this._reset = reset;
      this._ct = type;
      this.pool = [];
    }
    borrow(...argArray) {
      let ret;
      if (this.pool.length > 0)
        ret = this.pool.pop();
      else
        ret = new this._ct();
      if (this._init)
        this._init(ret, ...argArray);
      return ret;
    }
    returns(element) {
      if (Array.isArray(element)) {
        let count = element.length;
        for (let i = 0; i < count; i++) {
          let element2 = element[i];
          if (this._reset)
            this._reset(element2);
          this.pool.push(element2);
        }
        element.length = 0;
      } else {
        if (this._reset)
          this._reset(element);
        this.pool.push(element);
      }
    }
  };

  // src/utils/Timers.ts
  var _Timers = class _Timers {
    static add(delayInMiniseconds, repeat2, callback, target, callbackParam) {
      _Timers._add(delayInMiniseconds, repeat2, callback, target, callbackParam);
    }
    static callLater(callback, target, callbackParam) {
      _Timers._add(0, 1, callback, target, callbackParam);
    }
    static callDelay(delay, callback, target, callbackParam) {
      _Timers._add(delay, 1, callback, target, callbackParam);
    }
    static addUpdate(callback, target, callbackParam) {
      _Timers._add(0, 0, callback, target, callbackParam);
    }
    static has(callback, target) {
      return _items.findIndex((e) => e.target == target && e.callback == callback) != -1;
    }
    static remove(callback, target) {
      target = target || null;
      let index = _items.findIndex((e) => e.target === target && e.callback === callback);
      if (index !== -1) {
        let item = _items[index];
        _items.splice(index, 1);
        if (index < _iter)
          _iter--;
        _iterCount--;
        _pool.returns(item);
        return true;
      } else
        return false;
    }
    static runCallLater(callback, target) {
      _Timers.remove(callback, target);
      callback.call(target);
    }
    /** @internal */
    static _add(delayInMiniseconds, repeat2, callback, target, callbackParam) {
      let item;
      target = target || null;
      let index = _items.findIndex((e) => e.target === target && e.callback === callback);
      if (index !== -1)
        item = _items[index];
      else {
        item = _pool.borrow();
        item.callback = callback;
        item.target = target;
        _items.push(item);
      }
      item.delay = delayInMiniseconds;
      item.counter = 0;
      item.repeat = repeat2;
      item.param = callbackParam;
      item.end = false;
      return item;
    }
  };
  _Timers.deltaTime = 0;
  _Timers.time = 0;
  _Timers.frameCount = 0;
  var Timers = _Timers;
  var TimerItem = class {
    constructor() {
      this.delay = 0;
      this.counter = 0;
      this.repeat = 0;
    }
    advance(elapsed) {
      this.counter += elapsed;
      if (this.counter >= this.delay) {
        this.counter -= this.delay;
        if (this.counter > this.delay)
          this.counter = this.delay;
        if (this.repeat > 0) {
          this.repeat--;
          if (this.repeat == 0)
            this.end = true;
        }
        return true;
      } else
        return false;
    }
    reset() {
      this.callback = null;
      this.target = null;
      this.param = null;
    }
  };
  var _items = [];
  var _pool = new Pool(TimerItem, (e) => e.reset());
  var _iter = 0;
  var _iterCount = 0;
  var _lastTime = 0;
  function timer(timeStamp) {
    Timers.frameCount++;
    Timers.time = timeStamp;
    let deltaTime = timeStamp - _lastTime;
    Timers.deltaTime = deltaTime;
    _lastTime = timeStamp;
    _iter = 0;
    _iterCount = _items.length;
    while (_iter < _iterCount) {
      let item = _items[_iter];
      _iter++;
      if (item.advance(deltaTime)) {
        if (item.target && item.target.destroyed) {
          _iter--;
          _iterCount--;
          _items.splice(_iter, 1);
          _pool.returns(item);
          continue;
        }
        if (item.end) {
          _iter--;
          _iterCount--;
          _items.splice(_iter, 1);
        }
        try {
          item.callback.call(item.target, item.param);
        } catch (err) {
          console.error(err);
        }
        if (item.end)
          _pool.returns(item);
      }
    }
    requestAnimationFrame(timer);
  }
  requestAnimationFrame(timer);

  // src/utils/ToolSet.ts
  function clamp(value, min, max) {
    if (value < min)
      value = min;
    else if (value > max)
      value = max;
    return value;
  }
  function clamp01(value) {
    if (isNaN(value))
      value = 0;
    else if (value > 1)
      value = 1;
    else if (value < 0)
      value = 0;
    return value;
  }
  function lerp(start, end, percent) {
    return start + percent * (end - start);
  }
  function repeat(t, length) {
    return t - Math.floor(t / length) * length;
  }
  function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }
  function getBaseName(path) {
    let i = path.lastIndexOf("/");
    if (i != -1)
      path = path.substring(i + 1);
    i = path.indexOf("?");
    if (i != -1)
      path = path.substring(0, i);
    return path;
  }
  function getPath(url) {
    let i = url.lastIndexOf("/");
    return i > 0 ? url.substring(0, i + 1) : "";
  }
  function getFileExtension(path) {
    let i = path.lastIndexOf(".");
    if (i != -1) {
      let ext = path.substring(i + 1).toLowerCase();
      let j = ext.indexOf("?");
      if (j != -1)
        ext = ext.substring(0, j);
      if (ext === "ls") {
        let k = path.lastIndexOf(".", i - 1);
        if (k != -1) {
          let ext2 = path.substring(k + 1, i + 1) + ext;
          if (ext2 === "lanit.ls" || ext2 === "ltcb.ls")
            return ext2;
        }
      }
      return ext;
    } else
      return "";
  }
  function replaceFileExtension(path, newExt, excludeDot) {
    if (!path)
      return path;
    let i = path.lastIndexOf(".");
    if (newExt.length > 0 && !excludeDot)
      newExt = "." + newExt;
    if (i != -1) {
      let j = path.indexOf("?", i);
      if (j != -1)
        return path.substring(0, i) + newExt + path.substring(j);
      else
        return path.substring(0, i) + newExt;
    } else
      return path + newExt;
  }
  function normalizeURL(url) {
    if (url.indexOf("./") == -1)
      return url;
    let parts = url.split("/");
    let len = parts.length;
    let i = 0;
    while (i < len) {
      if (parts[i] == ".") {
        parts.splice(i, 1);
        len--;
        continue;
      } else if (parts[i] == "..") {
        let index = i - 1;
        if (index >= 0 && parts[index] !== "..") {
          parts.splice(index, 2);
          len -= 2;
          i--;
          continue;
        }
      }
      i++;
    }
    parts.length = len;
    return parts.join("/");
  }
  function getResURLByUUID(url, basePath) {
    if (url.indexOf(":") != -1)
      return url;
    else if (url.lastIndexOf(".") == -1)
      return "res://" + url;
    else if (basePath)
      return joinURL(basePath, url);
    else
      return url;
  }
  function joinURL(base, path) {
    if (!path)
      return "";
    if (path.indexOf(":") > 0)
      return path;
    if (base) {
      let char1 = path.charCodeAt(0);
      if (char1 !== 126 && char1 !== 47) {
        if (base.charCodeAt(base.length - 1) !== 47)
          path = base + "/" + path;
        else
          path = base + path;
      }
    }
    return normalizeURL(path);
  }
  function hookSetter(obj, callback, target, ...args) {
    return new Proxy(obj, {
      set: function(obj2, prop, value) {
        obj2[prop] = value;
        if (prop.constructor !== Symbol)
          callback.call(target, ...args);
        return true;
      },
      deleteProperty(obj2, prop) {
        delete target[prop];
        if (prop.constructor !== Symbol)
          callback.call(target, ...args);
        return true;
      }
    });
  }
  function hookSetterAsync(obj, callback, target) {
    return hookSetter(obj, Timers.callLater, Timers, callback, target);
  }

  // src/utils/Delegate.ts
  var ITEM_LAYOUT = 4;
  var Delegate = class {
    constructor() {
      this._flag = 0;
      this._items = [];
    }
    add(callback, target, args) {
      if (callback == null) {
        debugger;
        return;
      }
      target = target || null;
      let arr = this._items;
      let index = arr.findIndex((value, index2, arr2) => value === callback && arr2[index2 + 1] === target);
      if (index !== -1) {
        arr[index + 2] = args;
        arr[index + 3] = 1;
      } else
        arr.push(callback, target, args, 1);
    }
    once(callback, target, args) {
      target = target || null;
      let arr = this._items;
      let index = arr.findIndex((value, index2, arr2) => value === callback && arr2[index2 + 1] === target);
      if (index != -1) {
        arr[index + 2] = args;
        arr[index + 3] = 2;
      } else
        arr.push(callback, target, args, 2);
    }
    remove(callback, target) {
      target = target || null;
      let arr = this._items;
      let index = arr.findIndex((value, index2, arr2) => value === callback && arr2[index2 + 1] === target);
      if (index != -1) {
        if (this._flag != 0) {
          arr[index + 3] = 0;
          this._flag = 2;
        } else
          arr.splice(index, ITEM_LAYOUT);
      }
    }
    clear() {
      let arr = this._items;
      if (this._flag != 0) {
        arr.forEach((value, index, arr2) => {
          if (index % ITEM_LAYOUT === 3)
            arr2[index] = 0;
        });
        this._flag = 2;
      } else {
        arr.length = 0;
      }
    }
    clearForTarget(target) {
      if (!target)
        return;
      let arr = this._items;
      if (this._flag != 0) {
        arr.forEach((value, index, arr2) => {
          if (index % ITEM_LAYOUT === 1 && arr2[index] === target)
            arr2[index + 2] = 0;
        });
        this._flag = 2;
      } else {
        let i = arr.length - ITEM_LAYOUT;
        while (i >= 0) {
          if (arr[i + 1] === target)
            arr.splice(i, ITEM_LAYOUT);
          i -= ITEM_LAYOUT;
        }
      }
    }
    get count() {
      return this._items.length / ITEM_LAYOUT;
    }
    invoke(...args) {
      if (this._flag != 0)
        return;
      this._flag = 1;
      let arr = this._items;
      let cnt = arr.length;
      for (let i = 0; i < cnt; i += ITEM_LAYOUT) {
        if (arr[i + 3] === 0)
          continue;
        let fixedArgs = arr[i + 2];
        try {
          if (fixedArgs != null)
            arr[i].call(arr[i + 1], ...fixedArgs, ...args);
          else
            arr[i].call(arr[i + 1], ...args);
        } catch (err) {
          console.error(err);
        }
        if (arr[i + 3] === 2) {
          arr[i + 3] = 0;
          this._flag = 2;
        }
      }
      if (this._flag === 2) {
        let cnt2 = arr.length;
        let i = 0;
        while (i < cnt2) {
          if (arr[i + 3] === 0) {
            arr.splice(i, ITEM_LAYOUT);
            cnt2 -= ITEM_LAYOUT;
            continue;
          } else
            i += ITEM_LAYOUT;
        }
      }
      this._flag = 0;
    }
  };

  // src/utils/xml/XMLUtils.ts
  var XMLUtils = class {
    static decodeString(aSource) {
      let len = aSource.length;
      let sb = "";
      let pos1 = 0, pos2 = 0;
      while (true) {
        pos2 = aSource.indexOf("&", pos1);
        if (pos2 == -1) {
          sb += aSource.substring(pos1);
          break;
        }
        sb += aSource.substring(pos1, pos2);
        pos1 = pos2 + 1;
        pos2 = pos1;
        let end = Math.min(len, pos2 + 10);
        for (; pos2 < end; pos2++) {
          if (aSource[pos2] == ";")
            break;
        }
        if (pos2 < end && pos2 > pos1) {
          let entity = aSource.substring(pos1, pos2);
          let u = 0;
          if (entity[0] == "#") {
            if (entity.length > 1) {
              if (entity[1] == "x")
                u = parseInt(entity.substring(2), 16);
              else
                u = parseInt(entity.substring(1));
              sb += String.fromCharCode(u);
              pos1 = pos2 + 1;
            } else
              sb += "&";
          } else {
            switch (entity) {
              case "amp":
                u = 38;
                break;
              case "apos":
                u = 39;
                break;
              case "gt":
                u = 62;
                break;
              case "lt":
                u = 60;
                break;
              case "nbsp":
                u = 32;
                break;
              case "quot":
                u = 34;
                break;
            }
            if (u > 0) {
              sb += String.fromCharCode(u);
              pos1 = pos2 + 1;
            } else
              sb += "&";
          }
        } else {
          sb += "&";
        }
      }
      return sb;
    }
    static encodeString(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;");
    }
    static getString(attrs, attrName, defValue) {
      if (attrs == null)
        return defValue == null ? null : defValue;
      let ret = attrs[attrName];
      if (ret != null)
        return "" + ret;
      else
        return defValue == null ? null : defValue;
    }
    static getInt(attrs, attrName, defValue) {
      let value = this.getString(attrs, attrName);
      if (value != null && value.length > 0) {
        if (value[value.length - 1] == "%") {
          let ret = parseInt(value.substring(0, value.length - 1));
          if (!isNaN(ret))
            return Math.ceil(ret / 100 * defValue);
        } else {
          let ret = parseInt(value);
          if (!isNaN(ret))
            return ret;
        }
      }
      return defValue == null ? 0 : defValue;
    }
    static getFloat(attrs, attrName, defValue) {
      let value = this.getString(attrs, attrName);
      if (value == null || value.length == 0)
        return defValue == null ? 0 : defValue;
      let ret = parseFloat(value);
      if (isNaN(ret))
        return defValue == null ? 0 : defValue;
      else
        return ret;
    }
    static getBool(attrs, attrName, defValue) {
      let value = this.getString(attrs, attrName);
      if (value == null || value.length == 0)
        return defValue == null ? false : defValue;
      if (value == "true" || value == "1")
        return true;
      else if (value == "false" || value == "0")
        return false;
      else
        return defValue == null ? false : defValue;
    }
  };

  // src/utils/xml/XMLIterator.ts
  var XMLTagType = /* @__PURE__ */ ((XMLTagType2) => {
    XMLTagType2[XMLTagType2["Start"] = 0] = "Start";
    XMLTagType2[XMLTagType2["End"] = 1] = "End";
    XMLTagType2[XMLTagType2["Void"] = 2] = "Void";
    XMLTagType2[XMLTagType2["CDATA"] = 3] = "CDATA";
    XMLTagType2[XMLTagType2["Comment"] = 4] = "Comment";
    XMLTagType2[XMLTagType2["Instruction"] = 5] = "Instruction";
    return XMLTagType2;
  })(XMLTagType || {});
  var CDATA_START = "<![CDATA[";
  var CDATA_END = "]]>";
  var COMMENT_START = "<!--";
  var COMMENT_END = "-->";
  var _XMLIterator = class _XMLIterator {
    static begin(source, lowerCaseName) {
      _XMLIterator.source = source;
      _XMLIterator.lowerCaseName = lowerCaseName;
      this.sourceLen = source.length;
      this.parsePos = 0;
      this.lastTagEnd = 0;
      this.tagPos = 0;
      this.tagLength = 0;
      this.tagName = null;
    }
    static nextTag() {
      let pos;
      let c;
      let buffer = "";
      this.tagType = 0 /* Start */;
      this.lastTagEnd = this.parsePos;
      this.attrParsed = false;
      this.lastTagName = this.tagName;
      while ((pos = this.source.indexOf("<", this.parsePos)) != -1) {
        this.parsePos = pos;
        pos++;
        if (pos == this.sourceLen)
          break;
        c = this.source[pos];
        if (c == "!") {
          if (this.sourceLen > pos + 7 && this.source.substring(pos - 1, pos + 8) == CDATA_START) {
            pos = this.source.indexOf(CDATA_END, pos);
            this.tagType = 3 /* CDATA */;
            this.tagName = "";
            this.tagPos = this.parsePos;
            if (pos == -1)
              this.tagLength = this.sourceLen - this.parsePos;
            else
              this.tagLength = pos + 3 - this.parsePos;
            this.parsePos += this.tagLength;
            return true;
          } else if (this.sourceLen > pos + 2 && this.source.substring(pos - 1, pos + 3) == COMMENT_START) {
            pos = this.source.indexOf(COMMENT_END, pos);
            this.tagType = 4 /* Comment */;
            this.tagName = "";
            this.tagPos = this.parsePos;
            if (pos == -1)
              this.tagLength = this.sourceLen - this.parsePos;
            else
              this.tagLength = pos + 3 - this.parsePos;
            this.parsePos += this.tagLength;
            return true;
          } else {
            pos++;
            this.tagType = 5 /* Instruction */;
          }
        } else if (c == "/") {
          pos++;
          this.tagType = 1 /* End */;
        } else if (c == "?") {
          pos++;
          this.tagType = 5 /* Instruction */;
        }
        for (; pos < this.sourceLen; pos++) {
          c = this.source[pos];
          if (" 	\n\r\v".indexOf(c) != -1 || c == ">" || c == "/")
            break;
        }
        if (pos == this.sourceLen)
          break;
        buffer += this.source.substring(this.parsePos + 1, pos);
        if (buffer.length > 0 && buffer[0] == "/")
          buffer = buffer.substring(1);
        let singleQuoted = false, doubleQuoted = false;
        let possibleEnd = -1;
        for (; pos < this.sourceLen; pos++) {
          c = this.source[pos];
          if (c == '"') {
            if (!singleQuoted)
              doubleQuoted = !doubleQuoted;
          } else if (c == "'") {
            if (!doubleQuoted)
              singleQuoted = !singleQuoted;
          }
          if (c == ">") {
            if (!(singleQuoted || doubleQuoted)) {
              possibleEnd = -1;
              break;
            }
            possibleEnd = pos;
          } else if (c == "<")
            break;
        }
        if (possibleEnd != -1)
          pos = possibleEnd;
        if (pos == this.sourceLen)
          break;
        if (this.source[pos - 1] == "/")
          this.tagType = 2 /* Void */;
        this.tagName = buffer;
        if (this.lowerCaseName)
          this.tagName = this.tagName.toLowerCase();
        this.tagPos = this.parsePos;
        this.tagLength = pos + 1 - this.parsePos;
        this.parsePos += this.tagLength;
        return true;
      }
      this.tagPos = this.sourceLen;
      this.tagLength = 0;
      this.tagName = null;
      return false;
    }
    static getTagSource() {
      return this.source.substring(this.tagPos, this.tagPos + this.tagLength);
    }
    static getRawText(trim) {
      if (this.lastTagEnd == this.tagPos)
        return "";
      else if (trim) {
        let i = this.lastTagEnd;
        for (; i < this.tagPos; i++) {
          let c = this.source[i];
          if (" 	\n\r\v".indexOf(c) == -1)
            break;
        }
        if (i == this.tagPos)
          return "";
        else
          return this.source.substring(i, this.tagPos).trim();
      } else
        return this.source.substring(this.lastTagEnd, this.tagPos);
    }
    static getText(trim) {
      if (this.lastTagEnd == this.tagPos)
        return "";
      else if (trim) {
        let i = this.lastTagEnd;
        for (; i < this.tagPos; i++) {
          let c = this.source[i];
          if (" 	\n\r\v".indexOf(c) == -1)
            break;
        }
        if (i == this.tagPos)
          return "";
        else
          return XMLUtils.decodeString(this.source.substring(i, this.tagPos)).trimRight();
      } else
        return XMLUtils.decodeString(this.source.substring(this.lastTagEnd, this.tagPos));
    }
    static get attributes() {
      if (!this.attrParsed) {
        for (let key in this._attrs) {
          delete this._attrs[key];
        }
        this.parseAttributes(this._attrs);
        this.attrParsed = true;
      }
      return this._attrs;
    }
    static getAttribute(attrName) {
      return this.attributes[attrName];
    }
    static parseAttributes(attrs) {
      let attrName;
      let valueStart = 0;
      let valueEnd = 0;
      let waitValue = false;
      let quoted = 0;
      let buffer = "";
      let i = this.tagPos;
      let attrEnd = this.tagPos + this.tagLength;
      if (i < attrEnd && this.source[i] == "<") {
        for (; i < attrEnd; i++) {
          let c = this.source[i];
          if (" 	\n\r\v".indexOf(c) != -1 || c == ">" || c == "/")
            break;
        }
      }
      for (; i < attrEnd; i++) {
        let c = this.source[i];
        if (c == "=") {
          valueStart = -1;
          valueEnd = -1;
          quoted = 0;
          for (let j = i + 1; j < attrEnd; j++) {
            let c2 = this.source[j];
            if (" 	\n\r\v".indexOf(c2) != -1) {
              if (valueStart != -1 && quoted == 0) {
                valueEnd = j - 1;
                break;
              }
            } else if (c2 == ">") {
              if (quoted == 0) {
                valueEnd = j - 1;
                break;
              }
            } else if (c2 == '"') {
              if (valueStart != -1) {
                if (quoted != 1) {
                  valueEnd = j - 1;
                  break;
                }
              } else {
                quoted = 2;
                valueStart = j + 1;
              }
            } else if (c2 == "'") {
              if (valueStart != -1) {
                if (quoted != 2) {
                  valueEnd = j - 1;
                  break;
                }
              } else {
                quoted = 1;
                valueStart = j + 1;
              }
            } else if (valueStart == -1) {
              valueStart = j;
            }
          }
          if (valueStart != -1 && valueEnd != -1) {
            attrName = buffer;
            if (this.lowerCaseName)
              attrName = attrName.toLowerCase();
            buffer = "";
            attrs[attrName] = XMLUtils.decodeString(this.source.substring(valueStart, valueEnd + 1));
            i = valueEnd + 1;
          } else
            break;
        } else if (" 	\n\r\v".indexOf(c) == -1) {
          if (waitValue || c == "/" || c == ">") {
            if (buffer.length > 0) {
              attrName = buffer;
              if (this.lowerCaseName)
                attrName = attrName.toLowerCase();
              attrs[attrName] = "";
              buffer = "";
            }
            waitValue = false;
          }
          if (c != "/" && c != ">")
            buffer += c;
        } else {
          if (buffer.length > 0)
            waitValue = true;
        }
      }
    }
  };
  _XMLIterator._attrs = {};
  var XMLIterator = _XMLIterator;

  // src/utils/xml/XML.ts
  var XML = class _XML {
    constructor(XmlString) {
      if (XmlString)
        this.parse(XmlString);
    }
    get attributes() {
      if (!this._attrs)
        this._attrs = {};
      return this._attrs;
    }
    getAttrString(attrName, defValue) {
      return XMLUtils.getString(this._attrs, attrName, defValue);
    }
    getAttrInt(attrName, defValue) {
      return XMLUtils.getInt(this._attrs, attrName, defValue);
    }
    getAttrFloat(attrName, defValue) {
      return XMLUtils.getFloat(this._attrs, attrName, defValue);
    }
    getAttrBool(attrName, defValue) {
      return XMLUtils.getBool(this._attrs, attrName, defValue);
    }
    setAttribute(attrName, attrValue) {
      if (!this._attrs)
        this._attrs = {};
      this._attrs[attrName] = attrValue;
    }
    getNode(selector) {
      if (!this._children)
        return null;
      else
        return this._children.find((value) => {
          return value.name == selector;
        });
    }
    elements(selector) {
      if (!this._children)
        this._children = [];
      if (selector)
        return this._children.filter((value) => {
          return value.name == selector;
        });
      else
        return this._children;
    }
    parse(aSource) {
      this.reset();
      let lastOpenNode;
      let nodeStack = [];
      XMLIterator.begin(aSource);
      while (XMLIterator.nextTag()) {
        if (XMLIterator.tagType == 0 /* Start */ || XMLIterator.tagType == 2 /* Void */) {
          let childNode;
          if (lastOpenNode)
            childNode = new _XML();
          else {
            if (this.name != null) {
              this.reset();
              throw new Error("Invalid xml format - no root node.");
            }
            childNode = this;
          }
          childNode.name = XMLIterator.tagName;
          childNode._attrs = Object.assign({}, XMLIterator.attributes);
          if (lastOpenNode) {
            if (XMLIterator.tagType != 2 /* Void */)
              nodeStack.push(lastOpenNode);
            if (lastOpenNode._children == null)
              lastOpenNode._children = [];
            lastOpenNode._children.push(childNode);
          }
          if (XMLIterator.tagType != 2 /* Void */)
            lastOpenNode = childNode;
        } else if (XMLIterator.tagType == 1 /* End */) {
          if (lastOpenNode == null || lastOpenNode.name != XMLIterator.tagName) {
            this.reset();
            throw new Error("Invalid xml format - <" + XMLIterator.tagName + "> dismatched.");
          }
          if (lastOpenNode._children == null || lastOpenNode._children.length == 0) {
            lastOpenNode.text = XMLIterator.getText();
          }
          if (nodeStack.length > 0)
            lastOpenNode = nodeStack.pop();
          else
            lastOpenNode = null;
        }
      }
    }
    reset() {
      this._attrs = null;
      if (this._children != null)
        this._children.length == 0;
      this.text = null;
    }
    stringify(includeHeader) {
      let buf = [];
      if (includeHeader)
        buf.push('<?xml version="1.0" encoding="utf-8"?>\n');
      this.encode(buf, 0);
      return buf.join("");
    }
    encode(buf, tabs) {
      if (tabs > 0)
        buf.push(" ".repeat(tabs * 2));
      if (this.name == "!") {
        buf.push("<!--");
        if (this.text != null) {
          buf.push(XMLUtils.encodeString(this.text));
        }
        buf.push("-->");
        return;
      }
      buf.push("<");
      buf.push(this.name);
      if (this._attrs != null) {
        for (let k in this._attrs) {
          let v = this._attrs[k];
          v = XMLUtils.encodeString(v);
          buf.push(` ${k}="${v}"`);
        }
      }
      let numChildren = this._children != null ? this._children.length : 0;
      if (!this.text && numChildren == 0)
        buf.push("/>");
      else {
        buf.push(">");
        if (this.text) {
          buf.push(XMLUtils.encodeString(this.text));
        }
        if (numChildren > 0) {
          buf.push("\n");
          let ctabs = tabs + 1;
          for (let i = 0; i < numChildren; i++) {
            this._children[i].encode(buf, ctabs);
            buf.push("\n");
          }
          if (tabs > 0)
            buf.push(" ".repeat(tabs * 2));
        }
        buf.push(`</${this.name}>`);
      }
    }
  };

  // src/ui/ControllerRef.ts
  var ControllerRef = class {
    constructor(target, name) {
      if (arguments.length == 2) {
        this._target = target;
        this._name = name || "";
      } else {
        this._target = target.owner;
        this._name = target.name;
      }
      this._inst = null;
    }
    get target() {
      return this._target;
    }
    get name() {
      return this._name;
    }
    get inst() {
      return this._inst;
    }
    get selectedIndex() {
      return this._inst ? this._inst.selectedIndex : -1;
    }
    set selectedIndex(value) {
      if (this._inst)
        this._inst.selectedIndex = value;
    }
    get selectedPage() {
      return this._inst ? this._inst.selectedPage : "";
    }
    set selectedPage(value) {
      if (this._inst)
        this._inst.selectedPage = value;
    }
    get previousIndex() {
      return this._inst ? this._inst.selectedIndex : 0;
    }
    set oppositeIndex(value) {
      if (this._inst)
        this._inst.oppositeIndex = value;
    }
    release() {
      if (this._inited) {
        this._inited = false;
        this._target.off("controllers_changed", this._check, this);
        if (!UIPackage.isPlaying)
          this._target.off("instance_reload", this._reload, this);
        if (this._inst) {
          this._inst.off("changed", this._onChanged, this);
          this._inst = null;
        }
      }
    }
    validate() {
      if (!this._inited) {
        this._inited = true;
        this._target.on("controllers_changed", this._check, this);
        if (!UIPackage.isPlaying)
          this._target.on("instance_reload", this._reload, this);
        this._check(null);
      }
    }
    _reload(evt) {
      this._target = evt.data;
      this._check(evt);
    }
    _check(evt) {
      let c = this._target.getController(this._name);
      if (c != this._inst) {
        if (this._inst)
          this._inst.off("changed", this._onChanged, this);
        this._inst = c;
        if (c)
          c.on("changed", this._onChanged, this);
        if (evt != null)
          this._onChanged();
      }
    }
    _onChanged() {
      this.onChanged();
    }
  };

  // src/event/InputInfo.ts
  var InputInfo = class {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.mouseWheelDelta = 0;
      this.pointerId = 0;
      this.button = 0;
      this.clickCount = 0;
      this.holdTime = 0;
      this.shiftKey = false;
      this.altKey = false;
      this.ctrlKey = false;
      this.commandKey = false;
      this.keyCode = "";
      this.key = "";
      this.repeat = false;
      this.keyTimestamp = 0;
    }
    get isDblClick() {
      return this.clickCount == 2;
    }
    get isRightButton() {
      return this.button == 2;
    }
    get ctrlOrCmdKey() {
      return this.ctrlKey || this.commandKey;
    }
  };

  // src/event/Event.ts
  var _Event = class _Event {
    constructor() {
      /** @internal */
      this._callChain = [];
    }
    get type() {
      return this._type;
    }
    get target() {
      return this._target;
    }
    get sender() {
      return this._target;
    }
    get initiator() {
      return this._initiator;
    }
    get originalTarget() {
      return this._originalTarget;
    }
    isFromInput() {
      return this._initiator instanceof gui.TextInput || isNativeInputTarget(this._originalTarget);
    }
    get input() {
      return _Event._lastInput;
    }
    stopPropagation() {
      this._stopped = true;
    }
    preventDefault() {
      this._prevented = true;
    }
    capturePointer() {
      this._capture = true;
    }
    get isDefaultPrevented() {
      return this._prevented;
    }
  };
  _Event._lastInput = new InputInfo();
  var Event = _Event;
  function isNativeInputTarget(target) {
    if (!target)
      return false;
    if (target.tagName === "TEXTAREA")
      return true;
    if (target.tagName === "INPUT")
      return textInputTypes.has(target.type);
    const editable = target.closest?.("[contenteditable]");
    return editable?.isContentEditable === true;
  }
  var textInputTypes = /* @__PURE__ */ new Set([
    "text",
    "password",
    "search",
    "email",
    "url",
    "tel",
    "number"
  ]);

  // src/event/EventDispatcher.ts
  var EventDispatcher = class {
    constructor() {
      this._listeners = {};
    }
    on(type, callback, target, capture) {
      this.getDelegate(type, capture, true).add(callback, target);
    }
    off(type, callback, target, capture) {
      this.getDelegate(type, capture, false)?.remove(callback, target);
    }
    offAll(type, capture) {
      if (type)
        this.getDelegate(type, capture, false)?.clear();
      else {
        for (let k in this._listeners) {
          let col = this._listeners[k];
          capture ? col[1].clear() : col[0].clear();
        }
      }
    }
    offAllCaller(target) {
      for (let k in this._listeners) {
        let col = this._listeners[k];
        col[0].clearForTarget(target);
        col[1].clearForTarget(target);
      }
    }
    hasListener(type, capture) {
      return this.getDelegate(type, capture, false)?.count > 0;
    }
    emit(type, data, nativeEv, originalTarget) {
      let col = this._listeners[type];
      if (!col || col[0].count === 0 && col[1].count === 0)
        return false;
      let ev = EventPool.borrow(type);
      ev._type = type;
      ev._target = this;
      ev._originalTarget = originalTarget || this.element;
      ev.data = data;
      col[0].invoke(ev);
      col[1].invoke(ev);
      if (nativeEv) {
        if (ev._prevented)
          nativeEv.preventDefault();
        if (ev._stopped)
          nativeEv.stopPropagation();
      }
      EventPool.returns(ev);
      return ev._prevented;
    }
    bubbleEvent(type, data, initiator, originalTarget, addChain) {
      let widget = this;
      let ev = EventPool.borrow();
      ev._type = type;
      ev._initiator = initiator || widget;
      ev._originalTarget = originalTarget || ev._initiator.element;
      ev.data = data;
      let arr = ev._callChain;
      let p = widget;
      while (p) {
        arr.push(p);
        p = p.findParent();
      }
      let groot = widget.findRoot();
      for (let i = arr.length - 1; i >= 0; i--) {
        let obj = arr[i];
        let col = obj._listeners[type];
        if (col && col[1].count > 0) {
          ev._target = obj;
          col[1].invoke(ev);
          if (ev._capture) {
            ev._capture = false;
            if (type == "pointer_down")
              groot.inputMgr.addCaptor(ev.input.pointerId, obj);
          }
        }
      }
      if (!ev._stopped) {
        for (let i = 0; i < arr.length; i++) {
          let obj = arr[i];
          let col = obj._listeners[type];
          if (col && col[0].count > 0) {
            ev._target = obj;
            col[0].invoke(ev);
            if (ev._capture) {
              ev._capture = false;
              if (type == "pointer_down")
                groot.inputMgr.addCaptor(ev.input.pointerId, obj);
            }
            if (ev._stopped)
              break;
          }
        }
        if (addChain) {
          for (let i = 0; i < addChain.length; i++) {
            let obj = addChain[i];
            if (obj && arr.indexOf(obj) === -1) {
              let col = obj._listeners[type];
              if (col) {
                ev._target = obj;
                col[0].invoke(ev);
              }
            }
          }
        }
      }
      arr.length = 0;
      EventPool.returns(ev);
    }
    onStartListeningToType(type) {
    }
    getDelegate(type, capture, create) {
      let col = this._listeners[type];
      if (!col) {
        if (!create)
          return null;
        this.onStartListeningToType(type);
        this._listeners[type] = col = [new Delegate(), new Delegate()];
      }
      return col[capture ? 1 : 0];
    }
  };
  var EventPool = new Pool(
    Event,
    (obj) => {
      obj._stopped = false;
      obj._prevented = false;
      obj._capture = false;
      obj._callChain.length = 0;
    },
    (obj) => {
      obj.data = null;
      obj._initiator = null;
      obj._target = null;
      obj._originalTarget = null;
      obj._callChain.length = 0;
    }
  );

  // src/core/Resource.ts
  var _Resource = class _Resource extends EventDispatcher {
    constructor() {
      super();
      this._ref = 0;
      this._ref = 0;
    }
    get destroyed() {
      return this._destroyed;
    }
    get obsolute() {
      return this._obsolute;
    }
    set obsolute(value) {
      this._obsolute = value;
    }
    get refCount() {
      return this._ref;
    }
    isCreateFrom(url) {
      return this.uuid && url.length === this.uuid.length + 6 && url.endsWith(this.uuid) || this.url === url;
    }
    addRef(count) {
      this._ref += count || 1;
    }
    removeRef(count) {
      this._ref -= count || 1;
      if (_Resource._disposingCounter > 0 && this._ref <= 0 && !this.lock) {
        this.destroy();
      }
    }
    clearRef() {
      this._ref = 0;
    }
    onDestroy() {
    }
    destroy() {
      this.__destroy(false);
    }
    /** @internal */
    __destroy(clearing) {
      if (this._destroyed)
        return;
      this._destroyed = true;
      this.lock = false;
      _Resource._disposingCounter++;
      this.onDestroy();
      _Resource._disposingCounter--;
      this.offAll();
      if (this.url) {
        if (UIPackage.resourceMgr.debug)
          console.debug(`destroy ${Object.getPrototypeOf(this).constructor.name} ${this.url}`);
        if (!clearing)
          UIPackage.resourceMgr.clearRes(this.url, this);
      }
    }
  };
  /** @internal */
  _Resource._disposingCounter = 0;
  var Resource = _Resource;

  // src/core/PrefabParser.ts
  var firstRoundKeys = ["x", "y", "width", "height", "controllers"];
  var excludeKeys = /* @__PURE__ */ new Set([...firstRoundKeys, "relations", "gears"]);
  var PrefabParser = class {
    static parse(data, basePath, options, errors) {
      let canThrow = errors == null;
      errors = errors || [];
      let nodeMap = {};
      let dataList = [];
      let allNodes = [];
      let outNodes = [];
      let toDestroy = [];
      let inPrefab;
      let prefabNodeDict;
      let overrideData;
      if (options) {
        inPrefab = options.inPrefab;
        if (inPrefab)
          prefabNodeDict = options.prefabNodeDict;
        overrideData = options.overrideData;
      }
      function createChildren(data2, prefab) {
        for (let child of data2._$child) {
          if (child._$child) {
            let node = createNode(child, prefab);
            createChildren(child, child._$prefab ? node : prefab);
            dataList.push(child);
            allNodes.push(node);
          } else {
            let node = createNode(child, prefab);
            dataList.push(child);
            allNodes.push(node);
          }
        }
      }
      function createNode(nodeData, prefab, runtime2) {
        let node;
        let pstr;
        if (pstr = nodeData._$override) {
          if (prefab && prefabNodeDict) {
            if (Array.isArray(pstr)) {
              node = prefab;
              for (let i = 0, n = pstr.length; i < n; i++) {
                let map = prefabNodeDict.get(node);
                node = map?.[pstr[i]];
                if (!node)
                  break;
              }
            } else {
              let map = prefabNodeDict.get(prefab);
              if (map)
                node = map[nodeData._$override];
            }
          }
        } else {
          if (pstr = nodeData._$prefab) {
            if (pstr.lastIndexOf(".") == -1)
              pstr = "res://" + pstr;
            else if (basePath)
              pstr = joinURL(basePath, pstr);
            let res = UIPackage.resourceMgr.getRes(pstr);
            if (res) {
              if (!prefabNodeDict)
                prefabNodeDict = /* @__PURE__ */ new Map();
              let overrideData2 = [];
              let testId = nodeData._$id;
              if (overrideData) {
                for (let i = 0, n = overrideData.length; i < n; i++) {
                  let arr = overrideData[i];
                  if (arr && arr.length > 0) {
                    overrideData2[i] = arr.filter((d) => {
                      let od = d._$override || d._$parent;
                      return Array.isArray(od) && od.length > n - i && od[n - i - 1] == testId;
                    });
                  } else
                    overrideData2[i] = arr;
                }
              }
              overrideData2.push(nodeData._$child);
              let opt = { inPrefab: true, prefabNodeDict, overrideData: overrideData2 };
              if (runtime2)
                opt.runtime = runtime2;
              node = res.create(opt, errors);
            }
          } else if (pstr = nodeData._$type) {
            let cls = runtime2 ?? ClassUtils.getClass(pstr);
            if (cls) {
              try {
                node = new cls();
              } catch (err) {
                errors.push(err);
              }
            } else {
              errors.push(new Error(`unknown type '${pstr}'`));
            }
          }
          if (node)
            nodeMap[nodeData._$id] = node;
        }
        return node;
      }
      function getNodeByRef(idPath) {
        if (Array.isArray(idPath)) {
          let prefab = nodeMap[idPath[0]];
          if (prefab && idPath.length > 1)
            return findNodeInPrefab(prefab, idPath, 1);
          else
            return prefab;
        } else
          return nodeMap[idPath];
      }
      function findNodeInPrefab(prefab, idPath, startIndex = 0) {
        if (!idPath)
          return prefab;
        let map = prefabNodeDict?.get(prefab);
        if (!map)
          return null;
        if (Array.isArray(idPath)) {
          let node;
          for (let i = startIndex, n = idPath.length; i < n; i++) {
            if (!map)
              return null;
            node = map[idPath[i]];
            if (!node)
              break;
            map = prefabNodeDict.get(node);
          }
          return node;
        } else
          return map[idPath];
      }
      let bakedOverrideData;
      function getNodeData(node) {
        let i = allNodes.indexOf(node);
        let nodeData = dataList[i];
        node.removeSelf();
        toDestroy.push(nodeData._$id);
        allNodes[i] = null;
        if (!overrideData)
          return nodeData;
        if (bakedOverrideData === void 0)
          bakedOverrideData = SerializeUtil.bakeOverrideData(overrideData);
        if (bakedOverrideData)
          return SerializeUtil.applyOverrideData(nodeData, bakedOverrideData);
        else
          return nodeData;
      }
      let runtime;
      if (data._$type || data._$prefab) {
        if (options && options.runtime) {
          runtime = options.runtime;
        } else if (runtime = data._$runtime) {
          if (runtime.startsWith("res://"))
            runtime = runtime.substring(6);
          let cls = ClassUtils.getClass(runtime);
          if (cls)
            runtime = cls;
          else {
            errors.push(new Error(`unknown runtime '${runtime}'`));
            runtime = null;
          }
        }
        let node = createNode(data, null, runtime);
        if (node) {
          if (data._$child)
            createChildren(data, data._$prefab ? node : null);
          dataList.push(data);
          allNodes.push(node);
        }
      } else {
        if (data._$child)
          createChildren(data, null);
      }
      let nodeCnt = dataList.length;
      let outNodeData = [];
      let k = 0;
      for (let i = 0; i < nodeCnt; i++) {
        let nodeData = dataList[i];
        let node = allNodes[i];
        let children = nodeData._$child;
        if (children) {
          let num = children.length;
          if (node) {
            if (nodeData._$prefab) {
              for (let j = 0; j < num; j++) {
                let m = k - num + j;
                let n = outNodes[m];
                if (n && !n.parent) {
                  let nodeData2 = outNodeData[m];
                  let parentNode = findNodeInPrefab(node, nodeData2._$parent);
                  if (parentNode) {
                    let pos = nodeData2._$index;
                    if (pos != null && pos < parentNode.numChildren)
                      parentNode.addChildAt(n, pos);
                    else
                      parentNode.addChild(n);
                  } else {
                    node.addChildAt(n, 0);
                  }
                }
              }
            } else {
              for (let j = 0; j < num; j++) {
                let n = outNodes[k - num + j];
                if (n)
                  node.addChild(n);
              }
            }
          }
          k -= num;
        }
        outNodes[k] = node;
        outNodeData[k] = nodeData;
        k++;
      }
      outNodes.length = k;
      outNodes = outNodes.filter((n) => n != null);
      let topNode = outNodes[0];
      if (topNode == null) {
        if (canThrow && errors.length > 0)
          errors.forEach((err) => console.warn(err));
        return null;
      }
      let compInitList = [];
      for (let i = 0; i < nodeCnt; i++) {
        let components = dataList[i]._$comp;
        if (!components)
          continue;
        let node = allNodes[i];
        if (!node)
          continue;
        for (let compData of components) {
          let comp;
          if (compData._$override) {
            let cls = ClassUtils.getClass(compData._$override);
            if (cls)
              comp = node.getComponent(cls);
          } else {
            let cls = ClassUtils.getClass(compData._$type);
            if (cls) {
              comp = node.getComponent(cls);
              if (!comp) {
                try {
                  comp = node.addComponent(cls);
                } catch (err) {
                  errors.push(err);
                }
              }
            }
          }
          if (comp)
            compInitList.push(compData, comp);
        }
      }
      const utils = new SerializeUtil();
      utils.errors = errors;
      utils.getNodeByRef = getNodeByRef;
      utils.getNodeData = getNodeData;
      utils.basePath = basePath;
      for (let i = 0; i < nodeCnt; i++) {
        let nodeData = dataList[i];
        let node = allNodes[i];
        if (node) {
          utils.decodeObjBounds(nodeData, node);
          if (runtime && nodeData._$var && node.name) {
            try {
              topNode[node.name] = node;
            } catch (err) {
              errors.push(err);
            }
          }
        }
      }
      topNode.sourceWidth = topNode.width;
      topNode.sourceHeight = topNode.height;
      for (let i = 0; i < nodeCnt; i++) {
        let nodeData = dataList[i];
        let node = allNodes[i];
        if (node) {
          let v = nodeData["relations"];
          if (v != null) {
            if (nodeData._$prefab != null)
              node._addRelations(utils.decodeObj(v));
            else
              node.relations = utils.decodeObj(v);
          }
        }
      }
      for (let i = 0; i < nodeCnt; i++) {
        let nodeData = dataList[i];
        let node = allNodes[i];
        if (node) {
          utils.decodeObjWithFilter(nodeData, node, excludeKeys);
          try {
            SerializeUtil._data = nodeData;
            node.onAfterDeserialize();
          } catch (error) {
            errors.push(error);
          }
        }
      }
      for (let i = 0, cnt = compInitList.length; i < cnt; i += 2) {
        let compData = compInitList[i];
        let comp = compInitList[i + 1];
        utils.decodeObj(compData, comp);
        try {
          SerializeUtil._data = compData;
          comp.onAfterDeserialize();
        } catch (error) {
          errors.push(error);
        }
      }
      for (let i = 0; i < nodeCnt; i++) {
        let nodeData = dataList[i];
        let node = allNodes[i];
        if (node) {
          let v = nodeData["gears"];
          if (v != null) {
            if (nodeData._$prefab != null)
              node._addGears(utils.decodeObj(v));
            else
              node.gears = utils.decodeObj(v);
          }
        }
      }
      if (!prefabNodeDict || !prefabNodeDict.has(topNode)) {
        try {
          topNode._onConstruct(inPrefab);
        } catch (error) {
          errors.push(error);
        }
      }
      for (let nodeId of toDestroy) {
        let node = nodeMap[nodeId];
        if (!node.destroyed)
          node.destroy();
        delete nodeMap[nodeId];
      }
      if (inPrefab && prefabNodeDict)
        prefabNodeDict.set(topNode, nodeMap);
      if (canThrow && errors.length > 0)
        errors.forEach((err) => console.warn(err));
      return topNode;
    }
    static collectResourceLinks(data, basePath) {
      let test = {};
      let innerUrls = [];
      let dataType;
      function addInnerUrl(url) {
        if (!url)
          return "";
        let url2 = test[url];
        if (url2 === void 0) {
          url2 = getResURLByUUID(url, basePath);
          innerUrls.push(url2);
          test[url] = url2;
        }
        return url2;
      }
      function check(data2) {
        for (let key in data2) {
          let child = data2[key];
          if (child == null)
            continue;
          if (Array.isArray(child)) {
            for (let item of child) {
              if (item == null)
                continue;
              if ((dataType = typeof item) === "object") {
                if (item._$uuid != null)
                  addInnerUrl(item._$uuid);
                else if (item._$prefab != null) {
                  addInnerUrl(item._$prefab);
                  check(item);
                } else
                  check(item);
              } else if (dataType === "string" && item.startsWith("i18n:")) {
                let i = item.indexOf(":", 5);
                if (i != -1)
                  addInnerUrl(UIPackage.assetDb.getI18nSettingsURL(item.substring(5, i)));
              }
            }
          } else if ((dataType = typeof child) === "object") {
            if (child._$uuid != null)
              addInnerUrl(child._$uuid);
            else if (child._$prefab != null) {
              addInnerUrl(child._$prefab);
              check(child);
            } else
              check(child);
          } else if (dataType === "string" && child.startsWith("i18n:")) {
            let i = child.indexOf(":", 5);
            if (i != -1)
              addInnerUrl(UIPackage.assetDb.getI18nSettingsURL(child.substring(5, i)));
          }
        }
      }
      check(data);
      if (data._$preloads) {
        for (let url of data._$preloads)
          innerUrls.push(url);
      }
      return innerUrls;
    }
  };

  // src/core/Prefab.ts
  var _Prefab = class _Prefab extends Resource {
    /**
     * @en Instantiate a prefab from a URL.
     * @param url The URL of the prefab.
     * @param options Optional parameters for instantiation.
     * @zh 从 URL 实例化一个预制体。
     * @param url 预制体的 URL。
     * @param options 可选的实例化参数。 
     * @returns A promise that resolves to the instantiated Node. 
     */
    static instantiate(url, classType) {
      return UIPackage.resourceMgr.load(url).then((res) => {
        return res.create();
      });
    }
    constructor(data, basePath, deps) {
      super();
      this.data = data;
      this.basePath = basePath;
      this.url = "";
      this._deps = [];
      if (deps)
        this.addDeps(deps);
    }
    create(options, errors) {
      let runtime = ClassUtils.getRuntime(this.url);
      if (runtime) {
        if (!options)
          options = { runtime };
        else if (!options.runtime)
          options = Object.assign({ runtime }, options);
      }
      let ret = _Prefab.parserAPI.parse(this.data, this.basePath, options, errors);
      if (ret)
        ret.prefabUrl = this.url;
      return ret;
    }
    get deps() {
      return this._deps;
    }
    addDep(res) {
      if (!res)
        return;
      res.addRef();
      this._deps.push(res);
      if (!UIPackage.isPlaying && res instanceof _Prefab)
        res.on("obsolute", this.onDepObsolute, this);
    }
    addDeps(resArr) {
      for (let res of resArr) {
        if (!res)
          continue;
        res.addRef();
        this._deps.push(res);
        if (!UIPackage.isPlaying && res instanceof _Prefab)
          res.on("obsolute", this.onDepObsolute, this);
      }
    }
    onDestroy() {
      for (let res of this._deps) {
        res.removeRef();
        if (!UIPackage.isPlaying && res instanceof _Prefab)
          res.off("obsolute", this.onDepObsolute, this);
      }
    }
    get obsolute() {
      return this._obsolute;
    }
    set obsolute(value) {
      if (this._obsolute != value) {
        this._obsolute = value;
        if (value && !UIPackage.isPlaying)
          this.emit("obsolute");
      }
    }
    onDepObsolute() {
      this.obsolute = true;
    }
  };
  _Prefab.parserAPI = PrefabParser;
  var Prefab = _Prefab;

  // src/core/SerializeUtil.ts
  var TypedArrayClasses = {
    "Int8Array": Int8Array,
    "Uint8Array": Uint8Array,
    "Int16Array": Int16Array,
    "Uint16Array": Uint16Array,
    "Int32Array": Int32Array,
    "Uint32Array": Uint32Array,
    "Float32Array": Float32Array,
    "Float64Array": Float64Array
  };
  var _SerializeUtil = class _SerializeUtil {
    constructor() {
      this.getNodeByRef = dummy2;
      this.getNodeData = dummy2;
    }
    static hasProp(...keys) {
      for (let k of keys) {
        if (_SerializeUtil._data[k] !== void 0)
          return true;
      }
      return false;
    }
    decodeObj(data, obj) {
      _SerializeUtil.isDeserializing = true;
      try {
        return this._decode(data, obj);
      } finally {
        _SerializeUtil.isDeserializing = false;
      }
    }
    decodeObjBounds(data, obj) {
      _SerializeUtil.isDeserializing = true;
      try {
        let v0 = data["x"];
        let v1 = data["y"];
        if (v0 !== void 0 && v1 !== void 0)
          obj.setPos(v0, v1);
        else if (v0 !== void 0)
          obj.x = v0;
        else if (v1 !== void 0)
          obj.y = v1;
        v0 = data["width"];
        v1 = data["height"];
        if (v0 !== void 0 && v1 !== void 0)
          obj.setSize(v0, v1);
        else if (v0 !== void 0)
          obj.width = v0;
        else if (v1 !== void 0)
          obj.height = v1;
        v0 = data["controllers"];
        if (v0 !== void 0)
          obj.controllers = this._decode(v0);
      } finally {
        _SerializeUtil.isDeserializing = false;
      }
    }
    decodeObjSome(data, obj, includeKeys) {
      _SerializeUtil.isDeserializing = true;
      try {
        for (let k of includeKeys) {
          let value = data[k];
          if (value !== void 0)
            obj[k] = this._decode(value);
        }
      } finally {
        _SerializeUtil.isDeserializing = false;
      }
    }
    decodeObjWithFilter(data, obj, excludeKeys2) {
      _SerializeUtil.isDeserializing = true;
      try {
        this._decode(data, obj, excludeKeys2);
      } finally {
        _SerializeUtil.isDeserializing = false;
      }
    }
    _decode(data, obj, excludeKeys2) {
      if (data == null)
        return null;
      else if (Array.isArray(data)) {
        let arr = [];
        for (let i = 0; i < data.length; i++) {
          let v = data[i];
          if (v != null) {
            try {
              arr[i] = this._decode(v);
            } catch (error) {
              if (this.errors)
                this.errors.push(error);
              else
                console.error(error);
              arr[i] = null;
            }
          } else
            arr[i] = null;
        }
        return arr;
      } else if (typeof data === "object") {
        if (data._$uuid != null) {
          let url = getResURLByUUID(data._$uuid, this.basePath);
          return UIPackage.resourceMgr.getRes(url);
        }
        if (data._$ref != null) {
          let node = this.getNodeByRef(data._$ref);
          if (!node)
            return null;
          if (data._$type) {
            let cls = ClassUtils.getClass(data._$type);
            if (cls)
              return node.getComponent(cls);
            else
              return null;
          } else if (data._$ctrl !== void 0) {
            return new ControllerRef(node, data._$ctrl);
          } else
            return node;
        }
        let type = data._$type;
        if (type === "any") {
          if (data._$type)
            return data.value;
          else
            return data;
        }
        let typedArray = TypedArrayClasses[type];
        if (typedArray != null) {
          if (data._$type)
            return new typedArray(data.value);
          else
            return new typedArray(data);
        }
        if (!obj) {
          let cls = ClassUtils.getClass(type);
          if (!cls) {
            return null;
          }
          obj = new cls();
        }
        for (let key in data) {
          if (key.startsWith("_$") || excludeKeys2 && excludeKeys2.has(key))
            continue;
          let v = data[key];
          if (v == null || typeof v !== "object" || Array.isArray(v) || v._$type || v._$uuid || v._$ref) {
            try {
              let v2 = this._decode(v);
              obj[key] = v2;
              if (v2 != null && v != null && v._$tmpl) {
                let prefabData = this.getNodeData(v2);
                if (prefabData)
                  obj[v._$tmpl] = new Prefab(prefabData, this.basePath);
              }
            } catch (error) {
              if (this.errors)
                this.errors.push(error);
              else
                console.error(error);
            }
          } else {
            let childObj = obj[key];
            if (childObj) {
              try {
                this._decode(v, childObj);
              } catch (error) {
                if (this.errors)
                  this.errors.push(error);
                else
                  console.error(error);
              }
            }
          }
        }
        return obj;
      } else
        return data;
    }
    static bakeOverrideData(overrideData) {
      let dataMap = null;
      for (let n = overrideData.length, i = n - 1; i >= 0; i--) {
        let arr = overrideData[i];
        if (arr && arr.length > 0) {
          for (let d of arr) {
            let od = d._$override || d._$parent;
            let k;
            if (Array.isArray(od))
              k = od[n - i - 1];
            else if (i == n - 1)
              k = od;
            if (k != null) {
              if (!dataMap)
                dataMap = {};
              let arr2 = dataMap[k];
              if (!arr2)
                dataMap[k] = arr2 = [];
              arr2.push(n - i, d);
            }
          }
        }
      }
      return dataMap;
    }
    static applyOverrideData(nodeData, overrideDataMap) {
      function test(obj) {
        if (overrideDataMap[obj._$id])
          return true;
        let children = obj._$child;
        if (children && children.find((child) => test(child)))
          return true;
        return false;
      }
      function cloneTree(obj) {
        let ret = Object.assign({}, obj);
        let children = ret._$child;
        if (children)
          ret._$child = children.map((c) => cloneTree(c));
        let comps = ret._$comp;
        if (comps)
          ret._$comp = comps.map((c) => Object.assign({}, c));
        return ret;
      }
      function visit(data) {
        let children = data._$child;
        if (children) {
          for (let child of children) {
            if (child._$id)
              visit(child);
          }
        }
        let od = overrideDataMap[data._$id];
        if (od) {
          for (let i = 0; i < od.length; i += 2) {
            let j = od[i];
            let e = od[i + 1];
            let idPath;
            if (idPath = e._$override) {
              let toWrite;
              if (Array.isArray(idPath)) {
                if (j == idPath.length - 1) {
                  let k = idPath[j];
                  if (!children)
                    data._$child = children = [];
                  else
                    toWrite = children.find((c) => c._$override == k);
                  if (!toWrite) {
                    toWrite = { _$override: k };
                    children.push(toWrite);
                  }
                } else if (j < idPath.length - 1) {
                  let k = idPath.slice(j);
                  if (!children)
                    data._$child = children = [];
                  else {
                    toWrite = children.find((c) => {
                      let o = c._$override;
                      return Array.isArray(o) && arrayEquals(o, k);
                    });
                  }
                  if (!toWrite) {
                    toWrite = { _$override: k };
                    children.push(toWrite);
                  }
                } else
                  toWrite = data;
              } else
                toWrite = data;
              mergeData(toWrite, e);
              if (e._$comp) {
                let comps = toWrite._$comp;
                if (!comps)
                  toWrite._$comp = comps = [];
                for (let comp of e._$comp) {
                  let compType = comp._$type || comp._$override;
                  let c = comps.find((c2) => c2._$override == compType || c2._$type == compType);
                  if (!c) {
                    c = {};
                    if (comp._$type)
                      c._$type = compType;
                    else
                      c._$override = compType;
                    comps.push(c);
                  }
                  mergeData(c, comp);
                }
              }
            } else if (idPath = e._$parent) {
              if (!children)
                data._$child = children = [];
              let k;
              if (j < idPath.length) {
                if (j == idPath.length - 1)
                  k = idPath[j];
                else
                  k = idPath.slice(j);
                let toWrite = Object.assign({}, e);
                toWrite._$parent = k;
                children.push(toWrite);
              } else {
                let toWrite = Object.assign({}, e);
                delete toWrite._$parent;
                if (data._$prefab) {
                  children.push(toWrite);
                } else {
                  delete toWrite._$index;
                  if (e._$index < children.length)
                    children.splice(e._$index, 0, toWrite);
                  else
                    children.push(toWrite);
                }
              }
            }
          }
        }
      }
      if (test(nodeData)) {
        nodeData = cloneTree(nodeData);
        visit(nodeData);
      }
      return nodeData;
    }
  };
  _SerializeUtil.isDeserializing = false;
  var SerializeUtil = _SerializeUtil;
  function mergeData(target, overrided) {
    for (let k in overrided) {
      if (k.startsWith("_$"))
        continue;
      let v = overrided[k];
      if (v != null && typeof v === "object" && !Array.isArray(v) && !(v._$type || v._$uuid || v._$ref)) {
        let v2 = target[k];
        if (v2 != null && typeof v2 === "object") {
          target[k] = v2 = Object.assign({}, v2);
          mergeData(v2, v);
        } else
          target[k] = v;
      } else
        target[k] = v;
    }
  }
  function arrayEquals(a, b) {
    if (a.length === b.length) {
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  }
  function dummy2(...args) {
    return null;
  }

  // src/math/Vec2.ts
  var Vec2 = class _Vec2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    set(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }
    reset() {
      this.x = this.y = 0;
      return this;
    }
    distance(x, y) {
      return Math.sqrt((this.x - x) * (this.x - x) + (this.y - y) * (this.y - y));
    }
    toString() {
      return this.x + "," + this.y;
    }
    normalize() {
      let d = Math.sqrt(this.x * this.x + this.y * this.y);
      if (d > 0) {
        let id = 1 / d;
        this.x *= id;
        this.y *= id;
      }
    }
    copy(Vec22) {
      return this.set(Vec22.x, Vec22.y);
    }
    clone() {
      return new _Vec2(this.x, this.y);
    }
    equals(another) {
      return this.x == another.x && this.y == another.y;
    }
  };

  // src/display/UIElement.ts
  var UIElement = class _UIElement extends HTMLDivElement {
    constructor() {
      super();
      this._x = 0;
      this._y = 0;
      this._width = 0;
      this._height = 0;
      this._alpha = 1;
      this._grayed = false;
      this._visible = true;
      this._finalGrayed = false;
      this._touchable = true;
      this._touchThrough = false;
      this._touchFlag = 0;
      this._scaleX = 1;
      this._scaleY = 1;
      this._rot = 0;
      this._anchorX = 0;
      this._anchorY = 0;
      this._transformDirty = false;
      this._disableLowScroll = false;
    }
    static create() {
      let element = document.createElement("div", { is: "ui-div" });
      element.classList.add("ui-element");
      return element;
    }
    get name() {
      return this.id;
    }
    set name(value) {
      this.id = value;
    }
    get x() {
      return this._x;
    }
    set x(value) {
      this.setPos(value, this._y);
    }
    get y() {
      return this._y;
    }
    set y(value) {
      this.setPos(this._x, value);
    }
    setPos(x, y) {
      if (this._x != x || this._y != y) {
        this._x = x;
        this._y = y;
        this.style.left = x + "px";
        this.style.top = y + "px";
      }
    }
    get width() {
      return this._width;
    }
    set width(value) {
      this.setSize(value, this._height);
    }
    get height() {
      return this._height;
    }
    set height(value) {
      this.setSize(this._width, value);
    }
    setSize(wv, hv) {
      if (wv != this._width || hv != this._height) {
        this._width = wv;
        this._height = hv;
        this.style.width = this._width + "px";
        this.style.height = this._height + "px";
      }
    }
    get anchorX() {
      return this._anchorX;
    }
    set anchorX(value) {
      this.setAnchor(value, this._anchorY);
    }
    get anchorY() {
      return this._anchorY;
    }
    set anchorY(value) {
      this.setAnchor(this._anchorX, value);
    }
    setAnchor(xv, yv) {
      if (this._anchorX != xv || this._anchorY != yv) {
        this._anchorX = xv;
        this._anchorY = yv;
        this._transformDirty = true;
        Timers.callLater(this.updateTransform, this);
      }
    }
    get scaleX() {
      return this._scaleX;
    }
    set scaleX(value) {
      this.setScale(value, this._scaleY);
    }
    get scaleY() {
      return this._scaleY;
    }
    set scaleY(value) {
      this.setScale(this._scaleX, value);
    }
    setScale(xv, yv) {
      if (this._scaleX != xv || this._scaleY != yv) {
        this._scaleX = xv;
        this._scaleY = yv;
        this._transformDirty = true;
        Timers.callLater(this.updateTransform, this);
      }
    }
    get rotation() {
      return this._rot;
    }
    set rotation(value) {
      if (this._rot != value) {
        this._rot = value;
        this._transformDirty = true;
        Timers.callLater(this.updateTransform, this);
      }
    }
    get alpha() {
      return this._alpha;
    }
    set alpha(value) {
      if (this._alpha != value) {
        this._alpha = value;
        this.style.opacity = this._alpha.toFixed(3);
      }
    }
    get visible() {
      return this._visible;
    }
    set visible(value) {
      this._visible = value;
      if (this.owner?._getBit(NodeFlags.EDITING_NODE)) {
        if (value)
          this.style.visibility = "";
        else
          this.style.visibility = "hidden";
      } else {
        if (value)
          this.style.display = "";
        else
          this.style.display = "none";
      }
    }
    get grayed() {
      return this._grayed;
    }
    set grayed(value) {
      if (this._grayed != value) {
        this._grayed = value;
        let str = this.style.filter.replace(GRAYSCALE, "");
        if (value)
          this.style.filter = GRAYSCALE + " " + str;
        else
          this.style.filter = str;
        this.updateGrayed();
      }
    }
    appendChild(node) {
      let ret = super.appendChild(node);
      if (node instanceof _UIElement) {
        node.updatePointerEvents();
        node.updateGrayed();
      }
      return ret;
    }
    insertBefore(node, child) {
      let ret = super.insertBefore(node, child);
      if (node instanceof _UIElement) {
        node.updatePointerEvents();
        node.updateGrayed();
      }
      return ret;
    }
    removeSelf() {
      if (this.parentElement)
        this.parentElement.removeChild(this);
    }
    globalToLocal(x, y, out) {
      if (this._transformDirty) {
        Timers.remove(this.updateTransform, this);
        this.updateTransform();
      }
      let rect = this.getBoundingClientRect();
      let sx = this._width > 0 ? rect.width / this._width : 1;
      let sy = this._height > 0 ? rect.height / this._height : 1;
      if (!out)
        out = new Vec2();
      out.x = (x - rect.x) / (sx == 0 ? 1 : sx);
      out.y = (y - rect.y) / (sy == 0 ? 1 : sy);
      return out;
    }
    localToGlobal(x, y, out) {
      if (this._transformDirty) {
        Timers.remove(this.updateTransform, this);
        this.updateTransform();
      }
      let rect = this.getBoundingClientRect();
      let sx = this._width > 0 ? rect.width / this._width : 1;
      let sy = this._height > 0 ? rect.height / this._height : 1;
      if (!out)
        out = new Vec2();
      out.x = x * sx + rect.x;
      out.y = y * sy + rect.y;
      return out;
    }
    get clipping() {
      return this.style.overflow == "hidden";
    }
    set clipping(value) {
      this.style.overflow = value ? "hidden" : "visible";
      if (!this._disableLowScroll) {
        this._disableLowScroll = true;
        this.addEventListener("scroll", () => this.scrollTo(0, 0));
      }
    }
    get touchable() {
      return this._touchable;
    }
    set touchable(value) {
      if (this._touchable != value) {
        this._touchable = value;
        this.updatePointerEvents();
      }
    }
    get touchThrough() {
      return this._touchThrough;
    }
    set touchThrough(value) {
      if (this._touchThrough != value) {
        this._touchThrough = value;
        this.updatePointerEvents();
      }
    }
    updateGrayed() {
      let f = this._grayed || !!this.parentElement?._finalGrayed;
      if (f != this._finalGrayed) {
        this._finalGrayed = f;
        let c = this.owner?.getController("grayed");
        if (c)
          c.selectedIndex = f ? 1 : 0;
        for (let i = 0, n = this.children.length; i < n; i++) {
          let child = this.children[i];
          if (child instanceof _UIElement)
            child.updateGrayed();
        }
      }
    }
    updatePointerEvents() {
      let inheritedFlag = this.parentElement?._touchFlag ?? 0;
      let t = inheritedFlag == 1 || !this._touchable ? 1 : this._touchThrough ? 2 : inheritedFlag;
      let str;
      if (!this._touchable || this._touchThrough)
        str = "none";
      else if (t == 2)
        str = "auto";
      else
        str = "";
      if (this.style.pointerEvents != str)
        this.style.pointerEvents = str;
      if (t != this._touchFlag) {
        this._touchFlag = t;
        for (let i = 0, n = this.children.length; i < n; i++) {
          let child = this.children[i];
          if (child instanceof _UIElement)
            child.updatePointerEvents();
        }
      }
    }
    updateTransform() {
      this._transformDirty = false;
      let str = [];
      if (this._anchorX != 0 || this._anchorY != 0)
        str.push(`translate(-${this._anchorX * 100}%, -${this._anchorY * 100}%)`);
      if (this._scaleX != 1)
        str.push(`scaleX(${this._scaleX})`);
      if (this._scaleY != 1)
        str.push(`scaleY(${this._scaleY})`);
      if (this._rot != 0)
        str.push(`rotate(${this._rot}deg)`);
      if (str.length > 0) {
        this.style.transform = str.join(" ");
        this.style.transformOrigin = this._anchorX * 100 + "% " + this._anchorY * 100 + "%";
      } else
        this.style.transform = "none";
    }
    clearBackgroundStyle() {
      let style = this.style;
      style.background = null;
      style.border = null;
      style.borderRadius = null;
      if (this._grayed)
        style.filter = GRAYSCALE;
      else
        style.filter = null;
      this.classList.remove("offsetChildren");
    }
    static addStyles(doc) {
      if (doc[stylesAddedKey])
        return;
      doc[stylesAddedKey] = true;
      doc.body.insertAdjacentHTML("afterbegin", "<style>" + _UIElement.getStyles() + "</style>");
    }
    static getStyles() {
      let fontFamily = UIConfig.defaultFont ? `font-family : ${UIConfig.defaultFont};` : "";
      return `
            .ui-link { color:inherit !important; }
            .ui-link:hover { color:inherit !important; }
            .ui-link-no_underline a { text-decoration:none }
            .ui-link-no_underline a:hover { text-decoration:none }

            .ui-root {
                -moz-user-select: none;
                -khtml-user-select: none;
                -webkit-user-select: none; 
                -ms-user-select:none;
                position: absolute;
                --offset-children-x : 0px;
                --offset-children-y : 0px;
                ${fontFamily}
            }

            .ui-root .ui-element {
                position: absolute;
                box-sizing: border-box;
                background-clip: padding-box;
            }

            .ui-root .ui-element:focus {
                outline: none;
            }

            .ui-text {
                position: absolute;
                padding: 2px;
                box-sizing: border-box;
                white-space: pre-wrap;
            } 

            .ui-root input.ui-input[type=text],.ui-root input.ui-input[type=password] {
                resize : none;
                overflow : scroll;
                outline : none;
                border : 0px;
                padding : ${defaultInputPadding.map((i) => i + "px").join(" ")};
                margin : 0px;
                position : absolute;
                background : transparent;
                box-sizing: border-box;
                ${fontFamily}
            }

            .ui-root input.ui-input[type=text]:focus,.ui-root input.ui-input[type=password]:focus {
                outline : none;
            }

            .ui-root textarea.ui-input {
                resize : none;
                overflow : scroll;
                outline : none;
                border : 0px;
                padding :  ${defaultInputPadding.map((i) => i + "px").join(" ")};
                margin : 0px;
                position : absolute;
                background : transparent;
                box-sizing: border-box;
                ${fontFamily}
            }

            .ui-root textarea.ui-input:focus {
                outline: none;
            }

            .ui-root textarea.ui-input::-webkit-scrollbar {
                display: none;
            }
            .ui-root .ui-element,.ui-root .ui-input,.ui-root .ui-text{touch-action:none}

            .selectable {
                -moz-user-select: text;
                -khtml-user-select: text;
                -webkit-user-select: text; 
                -ms-user-select: text;
            }

            .offsetChildren {}
            .offsetChildren > .ui-element {
                margin-top: var(--offset-children-x);
                margin-left: var(--offset-children-y);
            }
        `;
    }
  };
  var stylesAddedKey = Symbol();
  var defaultInputPadding = [1, 2, 1, 2];
  var GRAYSCALE = "grayscale(1)";

  // src/math/Rect.ts
  var Rect = class _Rect {
    constructor(x, y, width, height) {
      this.x = x || 0;
      this.y = y || 0;
      this.width = width || 0;
      this.height = height || 0;
    }
    set(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }
    setMinMax(xMin, yMin, xMax, yMax) {
      this.x = xMin;
      this.y = yMin;
      this.width = xMax - xMin;
      this.height = yMax - yMin;
    }
    get position() {
      return new Vec2(this.x, this.y);
    }
    get size() {
      return new Vec2(this.width, this.height);
    }
    get xMin() {
      return this.x;
    }
    set xMin(value) {
      let d = value - this.x;
      this.x = value;
      this.width -= d;
    }
    get xMax() {
      return this.x + this.width;
    }
    set xMax(value) {
      this.width = value - this.x;
    }
    get yMin() {
      return this.y;
    }
    set yMin(value) {
      let d = value - this.y;
      this.y = value;
      this.height -= d;
    }
    get yMax() {
      return this.y + this.height;
    }
    set yMax(value) {
      this.height = value - this.y;
    }
    intersection(another, out) {
      out = out || new _Rect();
      if (this.width == 0 || this.height == 0 || another.width == 0 || another.height == 0) {
        out.set(0, 0, 0, 0);
        return out;
      }
      let left = this.x > another.x ? this.x : another.x;
      let right = this.xMax < another.xMax ? this.xMax : another.xMax;
      let top = this.y > another.y ? this.y : another.y;
      let bottom = this.yMax < another.yMax ? this.yMax : another.yMax;
      if (left > right || top > bottom)
        out.set(0, 0, 0, 0);
      else
        out.setMinMax(left, top, right, bottom);
      return out;
    }
    intersects(another) {
      this.intersection(another, s_rect);
      return s_rect.width > 0 && s_rect.height > 0;
    }
    union(another, out) {
      out = out || new _Rect();
      if (another.width == 0 || another.height == 0) {
        if (out != this)
          out.copy(this);
        return out;
      }
      if (this.width == 0 || this.height == 0) {
        out.copy(another);
        return out;
      }
      let x = Math.min(this.x, another.x);
      let y = Math.min(this.y, another.y);
      out.setMinMax(x, y, Math.max(this.xMax, another.xMax), Math.max(this.yMax, another.yMax));
      return out;
    }
    extend(x, y) {
      this.x -= x;
      this.y -= y;
      this.width += x * 2;
      this.height += y * 2;
    }
    contains(x, y) {
      if (x instanceof Vec2) {
        y = x.y;
        x = x.x;
      }
      return x >= this.x && x < this.x + this.width && y >= this.y && y < this.y + this.height;
    }
    copy(source) {
      this.set(source.x, source.y, source.width, source.height);
    }
    clone() {
      return new _Rect(this.x, this.y, this.width, this.height);
    }
    equals(another) {
      return this.x == another.x && this.y == another.y && this.width == another.width && this.height == another.height;
    }
  };
  var s_rect = new Rect();

  // src/ui/Controller.ts
  var Controller = class extends EventDispatcher {
    constructor() {
      super();
      this.name = "";
      this._pages = [];
      this._selectedIndex = -1;
      this._previousIndex = -1;
    }
    get pages() {
      return this._pages;
    }
    set pages(value) {
      this._pages = value;
      if (value.length > 0 && this._selectedIndex == -1)
        this.selectedIndex = 0;
    }
    get numPages() {
      return this._pages.length;
    }
    set numPages(value) {
      this._pages.length = value;
      for (let i = 0; i < value; i++)
        if (this._pages[i] == null)
          this._pages[i] = "";
    }
    addPage(name) {
      name = name || "";
      this._pages.push(name);
      if (this._selectedIndex == -1)
        this.selectedIndex = 0;
      return this;
    }
    get selectedIndex() {
      return this._selectedIndex;
    }
    set selectedIndex(value) {
      if (this._pages.length == 0)
        return;
      if (this._selectedIndex != value) {
        if (value > this._pages.length - 1) {
          console.warn("index out of bounds: " + value);
          return;
        }
        this._previousIndex = this._selectedIndex;
        this._selectedIndex = value;
        this.changing = true;
        this.emit("changed");
        this.changing = false;
      }
    }
    get selectedPage() {
      if (this._selectedIndex < 0 || this._selectedIndex >= this._pages.length)
        return null;
      else
        return this._pages[this._selectedIndex];
    }
    set selectedPage(value) {
      let i = this._pages.indexOf(value);
      if (i == -1)
        i = 0;
      this.selectedIndex = i;
    }
    get previousIndex() {
      return this._previousIndex;
    }
    set oppositeIndex(value) {
      if (value > 0)
        this.selectedIndex = 0;
      else if (this._pages.length > 1)
        this.selectedIndex = 1;
    }
  };

  // src/ui/DragSupport.ts
  var _rect = new Rect();
  var _vec2 = new Vec2();
  var _globalDragStart = new Vec2();
  var _globalRect = new Rect();
  var draggingInst;
  var DragSupport = class {
    constructor(owner) {
      this.enablePointerCapture = true;
      this._dragStartPos = new Vec2();
      this._dragTesting = false;
      this._owner = owner;
    }
    static get draggingInst() {
      return draggingInst;
    }
    setAutoStart(value) {
      let o = this._owner;
      if (value) {
        o.on("pointer_down", this._touchBegin, this);
        o.on("pointer_move", this._touchMove, this);
        o.on("pointer_up", this._touchEnd, this);
      } else {
        o.off("pointer_down", this._touchBegin, this);
        o.off("pointer_move", this._touchMove, this);
        o.off("pointer_up", this._touchEnd, this);
      }
    }
    start(pointerId) {
      if (draggingInst) {
        let tmp = draggingInst;
        draggingInst.stopDrag();
        draggingInst = null;
        tmp.emit("drag_end");
      }
      this._owner.on("pointer_move", this._touchMove, this);
      this._owner.on("pointer_up", this._touchEnd, this);
      let m = this._owner.findRoot().inputMgr;
      m.getPointerPos(pointerId, _globalDragStart);
      this._owner.localToGlobalRect(0, 0, this._owner.width, this._owner.height, _globalRect);
      this._dragTesting = false;
      draggingInst = this._owner;
      m.addCaptor(pointerId, this._owner);
      if (this.enablePointerCapture)
        this._owner.element.setPointerCapture(pointerId !== -1 ? pointerId : 1);
    }
    stop() {
      if (draggingInst == this._owner) {
        this._dragTesting = false;
        draggingInst = null;
      }
    }
    _touchBegin(evt) {
      let currentFocus = this._owner.findRoot().inputMgr.focus;
      if (currentFocus && "editable" in currentFocus && currentFocus.editable) {
        this._dragTesting = false;
        return;
      }
      if (this._dragStartPos == null)
        this._dragStartPos = new Vec2();
      this._dragStartPos.set(evt.input.x, evt.input.y);
      this._dragTesting = true;
      evt.capturePointer();
    }
    _touchMove(evt) {
      if (this._dragTesting && draggingInst != this._owner) {
        let sensitivity;
        if (this._owner.findRoot().inputMgr.touchScreen)
          sensitivity = UIConfig.touchDragSensitivity;
        else
          sensitivity = UIConfig.clickDragSensitivity;
        if (this._dragStartPos && Math.abs(this._dragStartPos.x - evt.input.x) < sensitivity && Math.abs(this._dragStartPos.y - evt.input.y) < sensitivity)
          return;
        this._dragTesting = false;
        if (!this._owner.emit("drag_start", evt.input.pointerId))
          this.start(evt.input.pointerId);
      }
      if (draggingInst == this._owner) {
        let xx = evt.input.x - _globalDragStart.x + _globalRect.x;
        let yy = evt.input.y - _globalDragStart.y + _globalRect.y;
        let dragBounds = this._owner.dragBounds;
        if (dragBounds) {
          let rect = this._owner.findRoot().localToGlobalRect(
            dragBounds.x,
            dragBounds.y,
            dragBounds.width,
            dragBounds.height,
            _rect
          );
          if (xx < rect.x)
            xx = rect.x;
          else if (xx + _globalRect.width > rect.xMax) {
            xx = rect.xMax - _globalRect.width;
            if (xx < rect.x)
              xx = rect.x;
          }
          if (yy < rect.y)
            yy = rect.y;
          else if (yy + _globalRect.height > rect.yMax) {
            yy = rect.yMax - _globalRect.height;
            if (yy < rect.y)
              yy = rect.y;
          }
        }
        let pt = this._owner.parent.globalToLocal(xx, yy, _vec2);
        this._owner.setPos(Math.round(pt.x), Math.round(pt.y));
        this._owner.emit("drag_move");
      }
    }
    _touchEnd() {
      if (draggingInst == this._owner) {
        draggingInst = null;
        this._owner.emit("drag_end");
      }
    }
  };

  // src/ui/Relation.ts
  var handlingFlag = Symbol();
  var Relation = class {
    constructor() {
      this._data = [];
    }
    get owner() {
      return this._owner;
    }
    set owner(value) {
      this._owner = value;
      if (this._target) {
        if (this._owner)
          this.setTarget();
        else
          this.unsetTarget();
      }
    }
    set target(value) {
      if (this._target != value) {
        if (this._target)
          this.unsetTarget();
        this._target = value;
        if (this._owner && this._target)
          this.setTarget();
      }
    }
    get target() {
      return this._target;
    }
    get data() {
      return this._data;
    }
    set data(value) {
      this._data = value;
    }
    add(type, percent) {
      if (type == 100 /* Size */) {
        this.add(1 /* Width */, percent);
        this.add(2 /* Height */, percent);
        return;
      } else if (type == 101 /* Pos */) {
        this.add(3 /* Left_Left */, percent);
        this.add(10 /* Top_Top */, percent);
        return;
      } else if (type == 102 /* CenterAndMiddle */) {
        this.add(6 /* Center_Center */, percent);
        this.add(13 /* Middle_Middle */, percent);
        return;
      }
      if (this._data.findIndex((v, i) => v == type && i % 2 == 0) == -1)
        this._data.push(type, percent ? 1 : 0);
    }
    remove(type) {
      if (type == 100 /* Size */) {
        this.remove(1 /* Width */);
        this.remove(2 /* Height */);
        return;
      }
      for (let i = 0, n = this._data.length; i < n; i += 2) {
        if (this._data[i] == type) {
          this._data.splice(i, 2);
          break;
        }
      }
    }
    setTarget() {
      let t = this._target;
      this._tx = t.x;
      this._ty = t.y;
      this._tw = t.width;
      this._th = t.height;
      t.on("pos_changed", this.posChanged, this);
      t.on("size_changed", this.sizeChanged, this);
      if (!UIPackage.isPlaying)
        t.on("instance_reload", this.instReload, this);
    }
    unsetTarget() {
      this._target.off("pos_changed", this.posChanged, this);
      this._target.off("size_changed", this.sizeChanged, this);
      if (!UIPackage.isPlaying)
        this._target.off("instance_reload", this.instReload, this);
    }
    applyOnSelfResized() {
      if (this._data.length == 0)
        return;
      for (let i = 0, n = this._data.length; i < n; i += 2) {
        switch (this._data[i]) {
          case 6 /* Center_Center */:
            this._owner.x -= (0.5 - this._owner.anchorX) * this._owner._deltaWidth;
            break;
          case 8 /* Right_Center */:
          case 7 /* Right_Left */:
          case 9 /* Right_Right */:
            this._owner.x -= (1 - this._owner.anchorX) * this._owner._deltaWidth;
            break;
          case 13 /* Middle_Middle */:
            this._owner.y -= (0.5 - this._owner.anchorY) * this._owner._deltaHeight;
            break;
          case 15 /* Bottom_Middle */:
          case 14 /* Bottom_Top */:
          case 16 /* Bottom_Bottom */:
            this._owner.y -= (1 - this._owner.anchorY) * this._owner._deltaHeight;
            break;
        }
      }
    }
    applyOnPosChanged(type, dx, dy) {
      let tmp;
      switch (type) {
        case 3 /* Left_Left */:
        case 4 /* Left_Center */:
        case 5 /* Left_Right */:
        case 6 /* Center_Center */:
        case 7 /* Right_Left */:
        case 8 /* Right_Center */:
        case 9 /* Right_Right */:
          this._owner.x += dx;
          break;
        case 10 /* Top_Top */:
        case 11 /* Top_Middle */:
        case 12 /* Top_Bottom */:
        case 13 /* Middle_Middle */:
        case 14 /* Bottom_Top */:
        case 15 /* Bottom_Middle */:
        case 16 /* Bottom_Bottom */:
          this._owner.y += dy;
          break;
        case 1 /* Width */:
        case 2 /* Height */:
          break;
        case 17 /* LeftExt_Left */:
        case 18 /* LeftExt_Right */:
          tmp = this._owner.left;
          this._owner.width = this._owner._rawWidth - dx;
          this._owner.left = tmp + dx;
          break;
        case 19 /* RightExt_Left */:
        case 20 /* RightExt_Right */:
          tmp = this._owner.left;
          this._owner.width = this._owner._rawWidth + dx;
          this._owner.left = tmp;
          break;
        case 21 /* TopExt_Top */:
        case 22 /* TopExt_Bottom */:
          tmp = this._owner.top;
          this._owner.height = this._owner._rawHeight - dy;
          this._owner.top = tmp + dy;
          break;
        case 23 /* BottomExt_Top */:
        case 24 /* BottomExt_Bottom */:
          tmp = this._owner.top;
          this._owner.height = this._owner._rawHeight + dy;
          this._owner.top = tmp;
          break;
      }
    }
    applyOnSizeChanged(ow, type, percent, tw, th, isAncestor) {
      let pos = 0, anchor = 0, delta = 0;
      let v, tmp;
      let rw, rh;
      if (hRelations[type]) {
        if (!isAncestor) {
          pos = this._target.x;
          anchor = this._target.anchorX;
        }
        if (percent) {
          if (this._tw != 0)
            delta = tw / this._tw;
        } else
          delta = tw - this._tw;
      } else {
        if (!isAncestor) {
          pos = this._target.y;
          anchor = this._target.anchorY;
        }
        if (percent) {
          if (this._th != 0)
            delta = th / this._th;
        } else
          delta = th - this._th;
      }
      switch (type) {
        case 3 /* Left_Left */:
          if (percent)
            ow.left = pos + (ow.left - pos) * delta;
          else if (anchor != 0)
            ow.x += delta * -anchor;
          break;
        case 4 /* Left_Center */:
          if (percent)
            ow.left = pos + (ow.left - pos) * delta;
          else
            ow.x += delta * (0.5 - anchor);
          break;
        case 5 /* Left_Right */:
          if (percent)
            ow.left = pos + (ow.left - pos) * delta;
          else
            ow.x += delta * (1 - anchor);
          break;
        case 6 /* Center_Center */:
          if (percent)
            ow.left = pos + (ow.left + ow._rawWidth * 0.5 - pos) * delta - ow._rawWidth * 0.5;
          else
            ow.x += delta * (0.5 - anchor);
          break;
        case 7 /* Right_Left */:
          if (percent)
            ow.left = pos + (ow.left + ow._rawWidth - pos) * delta - ow._rawWidth;
          else if (anchor != 0)
            ow.x += delta * -anchor;
          break;
        case 8 /* Right_Center */:
          if (percent)
            ow.left = pos + (ow.left + ow._rawWidth - pos) * delta - ow._rawWidth;
          else
            ow.x += delta * (0.5 - anchor);
          break;
        case 9 /* Right_Right */:
          if (percent)
            ow.left = pos + (ow.left + ow._rawWidth - pos) * delta - ow._rawWidth;
          else
            ow.x += delta * (1 - anchor);
          break;
        case 10 /* Top_Top */:
          if (percent)
            ow.top = pos + (ow.top - pos) * delta;
          else if (anchor != 0)
            ow.y += delta * -anchor;
          break;
        case 11 /* Top_Middle */:
          if (percent)
            ow.top = pos + (ow.top - pos) * delta;
          else
            ow.y += delta * (0.5 - anchor);
          break;
        case 12 /* Top_Bottom */:
          if (percent)
            ow.top = pos + (ow.top - pos) * delta;
          else
            ow.y += delta * (1 - anchor);
          break;
        case 13 /* Middle_Middle */:
          if (percent)
            ow.top = pos + (ow.top + ow._rawHeight * 0.5 - pos) * delta - ow._rawHeight * 0.5;
          else
            ow.y += delta * (0.5 - anchor);
          break;
        case 14 /* Bottom_Top */:
          if (percent)
            ow.top = pos + (ow.top + ow._rawHeight - pos) * delta - ow._rawHeight;
          else if (anchor != 0)
            ow.y += delta * -anchor;
          break;
        case 15 /* Bottom_Middle */:
          if (percent)
            ow.top = pos + (ow.top + ow._rawHeight - pos) * delta - ow._rawHeight;
          else
            ow.y += delta * (0.5 - anchor);
          break;
        case 16 /* Bottom_Bottom */:
          if (percent)
            ow.top = pos + (ow.top + ow._rawHeight - pos) * delta - ow._rawHeight;
          else
            ow.y += delta * (1 - anchor);
          break;
        case 1 /* Width */:
          if (ow._deltaWidth != 0)
            break;
          if (this._sw != null) {
            v = this._sw - this._tw;
            this._sw = null;
          } else
            v = ow._rawWidth - this._tw;
          if (percent)
            v = v * delta;
          if (isAncestor) {
            tmp = ow.left;
            ow.setSize(tw + v, ow._rawHeight);
            ow.left = tmp;
          } else
            ow.width = tw + v;
          break;
        case 2 /* Height */:
          if (ow._deltaHeight != 0)
            break;
          if (this._sh != null) {
            v = this._sh - this._th;
            this._sh = null;
          } else
            v = ow._rawHeight - this._th;
          if (percent)
            v = v * delta;
          if (isAncestor) {
            tmp = ow.top;
            ow.setSize(ow._rawWidth, th + v);
            ow.top = tmp;
          } else
            ow.height = th + v;
          break;
        case 17 /* LeftExt_Left */:
          tmp = ow.left;
          if (percent)
            v = pos + (tmp - pos) * delta - tmp;
          else
            v = delta * -anchor;
          ow.width = ow._rawWidth - v;
          ow.left = tmp + v;
          break;
        case 18 /* LeftExt_Right */:
          tmp = ow.left;
          if (percent)
            v = pos + (tmp - pos) * delta - tmp;
          else
            v = delta * (1 - anchor);
          ow.width = ow._rawWidth - v;
          ow.left = tmp + v;
          break;
        case 19 /* RightExt_Left */:
          tmp = ow.left;
          if (percent)
            v = pos + (tmp + ow._rawWidth - pos) * delta - (tmp + ow._rawWidth);
          else
            v = delta * -anchor;
          ow.width = ow._rawWidth + v;
          ow.left = tmp;
          break;
        case 20 /* RightExt_Right */:
          if (ow._deltaWidth != 0)
            break;
          tmp = ow.left;
          rw = ow._rawWidth;
          if (this._sw != null) {
            rw = this._sw;
            this._sw = null;
          }
          if (percent) {
            v = pos + (tmp + rw - pos) * delta - (tmp + rw);
            ow.width = rw + v;
            ow.left = tmp;
          } else {
            v = delta * (1 - anchor);
            ow.width = rw + v;
            ow.left = tmp;
          }
          break;
        case 21 /* TopExt_Top */:
          tmp = ow.top;
          if (percent)
            v = pos + (tmp - pos) * delta - tmp;
          else
            v = delta * -anchor;
          ow.height = ow._rawHeight - v;
          ow.top = tmp + v;
          break;
        case 22 /* TopExt_Bottom */:
          tmp = ow.top;
          if (percent)
            v = pos + (tmp - pos) * delta - tmp;
          else
            v = delta * (1 - anchor);
          ow.height = ow._rawHeight - v;
          ow.top = tmp + v;
          break;
        case 23 /* BottomExt_Top */:
          tmp = ow.top;
          if (percent)
            v = pos + (tmp + ow._rawHeight - pos) * delta - (tmp + ow._rawHeight);
          else
            v = delta * -anchor;
          ow.height = ow._rawHeight + v;
          ow.top = tmp;
          break;
        case 24 /* BottomExt_Bottom */:
          if (ow._deltaHeight != 0)
            break;
          tmp = ow.top;
          rh = ow._rawHeight;
          if (this._sh != null) {
            rh = this._sh;
            this._sh = null;
          }
          if (percent) {
            v = pos + (tmp + rh - pos) * delta - (tmp + rh);
            ow.height = rh + v;
            ow.top = tmp;
          } else {
            v = delta * (1 - anchor);
            ow.height = rh + v;
            ow.top = tmp;
          }
          break;
      }
    }
    posChanged() {
      if (!this._owner || this._owner[handlingFlag] || this._isDisabled) {
        this._tx = this._target.x;
        this._ty = this._target.y;
        return;
      }
      if (this._target.isAncestorOf(this._owner))
        return;
      let tmp = SerializeUtil.isDeserializing;
      if (tmp)
        SerializeUtil.isDeserializing = false;
      this._owner[handlingFlag] = true;
      let dx = this._target.x - this._tx;
      let dy = this._target.y - this._ty;
      for (let i = 0, n = this._data.length; i < n; i += 2)
        this.applyOnPosChanged(this._data[i], dx, dy);
      this._owner[handlingFlag] = false;
      if (tmp)
        SerializeUtil.isDeserializing = true;
      this._tx = this._target.x;
      this._ty = this._target.y;
    }
    sizeChanged() {
      let tw = this._target.width, th = this._target.height;
      let ow = this._owner;
      if (!ow || ow[handlingFlag] || this._isDisabled) {
        this._tw = tw;
        this._th = th;
        return;
      }
      let isAncestor = this._target.isAncestorOf(ow);
      let tmp = SerializeUtil.isDeserializing;
      if (tmp)
        SerializeUtil.isDeserializing = false;
      ow[handlingFlag] = true;
      for (let i = 0, n = this._data.length; i < n; i += 2)
        this.applyOnSizeChanged(ow, this._data[i], this._data[i + 1] == 1, tw, th, isAncestor);
      ow[handlingFlag] = false;
      if (tmp)
        SerializeUtil.isDeserializing = true;
      this._tw = tw;
      this._th = th;
    }
    instReload(evt) {
      this.target = evt.data;
    }
  };
  var hRelations = [];
  (function() {
    const arr = [
      1 /* Width */,
      3 /* Left_Left */,
      4 /* Left_Center */,
      5 /* Left_Right */,
      6 /* Center_Center */,
      7 /* Right_Left */,
      8 /* Right_Center */,
      9 /* Right_Right */,
      17 /* LeftExt_Left */,
      18 /* LeftExt_Right */,
      19 /* RightExt_Left */,
      20 /* RightExt_Right */
    ];
    for (let i of arr)
      hRelations[i] = true;
  })();

  // src/tween/EaseType.ts
  var EaseType = /* @__PURE__ */ ((EaseType2) => {
    EaseType2[EaseType2["Linear"] = 0] = "Linear";
    EaseType2[EaseType2["SineIn"] = 1] = "SineIn";
    EaseType2[EaseType2["SineOut"] = 2] = "SineOut";
    EaseType2[EaseType2["SineInOut"] = 3] = "SineInOut";
    EaseType2[EaseType2["QuadIn"] = 4] = "QuadIn";
    EaseType2[EaseType2["QuadOut"] = 5] = "QuadOut";
    EaseType2[EaseType2["QuadInOut"] = 6] = "QuadInOut";
    EaseType2[EaseType2["CubicIn"] = 7] = "CubicIn";
    EaseType2[EaseType2["CubicOut"] = 8] = "CubicOut";
    EaseType2[EaseType2["CubicInOut"] = 9] = "CubicInOut";
    EaseType2[EaseType2["QuartIn"] = 10] = "QuartIn";
    EaseType2[EaseType2["QuartOut"] = 11] = "QuartOut";
    EaseType2[EaseType2["QuartInOut"] = 12] = "QuartInOut";
    EaseType2[EaseType2["QuintIn"] = 13] = "QuintIn";
    EaseType2[EaseType2["QuintOut"] = 14] = "QuintOut";
    EaseType2[EaseType2["QuintInOut"] = 15] = "QuintInOut";
    EaseType2[EaseType2["ExpoIn"] = 16] = "ExpoIn";
    EaseType2[EaseType2["ExpoOut"] = 17] = "ExpoOut";
    EaseType2[EaseType2["ExpoInOut"] = 18] = "ExpoInOut";
    EaseType2[EaseType2["CircIn"] = 19] = "CircIn";
    EaseType2[EaseType2["CircOut"] = 20] = "CircOut";
    EaseType2[EaseType2["CircInOut"] = 21] = "CircInOut";
    EaseType2[EaseType2["ElasticIn"] = 22] = "ElasticIn";
    EaseType2[EaseType2["ElasticOut"] = 23] = "ElasticOut";
    EaseType2[EaseType2["ElasticInOut"] = 24] = "ElasticInOut";
    EaseType2[EaseType2["BackIn"] = 25] = "BackIn";
    EaseType2[EaseType2["BackOut"] = 26] = "BackOut";
    EaseType2[EaseType2["BackInOut"] = 27] = "BackInOut";
    EaseType2[EaseType2["BounceIn"] = 28] = "BounceIn";
    EaseType2[EaseType2["BounceOut"] = 29] = "BounceOut";
    EaseType2[EaseType2["BounceInOut"] = 30] = "BounceInOut";
    EaseType2[EaseType2["Custom"] = 31] = "Custom";
    return EaseType2;
  })(EaseType || {});

  // src/tween/TweenValue.ts
  var TweenValue = class {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.w = 0;
    }
    get color() {
      return (this.w << 24) + (this.x << 16) + (this.y << 8) + this.z;
    }
    set color(value) {
      this.x = (value & 16711680) >> 16;
      this.y = (value & 65280) >> 8;
      this.z = value & 255;
      this.w = (value & 4278190080) >> 24;
    }
    getField(index) {
      switch (index) {
        case 0:
          return this.x;
        case 1:
          return this.y;
        case 2:
          return this.z;
        case 3:
          return this.w;
        default:
          throw new Error("Index out of bounds: " + index);
      }
    }
    setField(index, value) {
      switch (index) {
        case 0:
          this.x = value;
          break;
        case 1:
          this.y = value;
          break;
        case 2:
          this.z = value;
          break;
        case 3:
          this.w = value;
          break;
        default:
          throw new Error("Index out of bounds: " + index);
      }
    }
    reset() {
      this.x = this.y = this.z = this.w = 0;
    }
  };

  // src/tween/EaseManager.ts
  var _PiOver2 = Math.PI * 0.5;
  var _TwoPi = Math.PI * 2;
  function evaluateEase(easeType, time, duration, overshootOrAmplitude, period) {
    switch (easeType) {
      case 0 /* Linear */:
        return time / duration;
      case 1 /* SineIn */:
        return -Math.cos(time / duration * _PiOver2) + 1;
      case 2 /* SineOut */:
        return Math.sin(time / duration * _PiOver2);
      case 3 /* SineInOut */:
        return -0.5 * (Math.cos(Math.PI * time / duration) - 1);
      case 4 /* QuadIn */:
        return (time /= duration) * time;
      case 5 /* QuadOut */:
        return -(time /= duration) * (time - 2);
      case 6 /* QuadInOut */:
        if ((time /= duration * 0.5) < 1)
          return 0.5 * time * time;
        return -0.5 * (--time * (time - 2) - 1);
      case 7 /* CubicIn */:
        return (time /= duration) * time * time;
      case 8 /* CubicOut */:
        return (time = time / duration - 1) * time * time + 1;
      case 9 /* CubicInOut */:
        if ((time /= duration * 0.5) < 1)
          return 0.5 * time * time * time;
        return 0.5 * ((time -= 2) * time * time + 2);
      case 10 /* QuartIn */:
        return (time /= duration) * time * time * time;
      case 11 /* QuartOut */:
        return -((time = time / duration - 1) * time * time * time - 1);
      case 12 /* QuartInOut */:
        if ((time /= duration * 0.5) < 1)
          return 0.5 * time * time * time * time;
        return -0.5 * ((time -= 2) * time * time * time - 2);
      case 13 /* QuintIn */:
        return (time /= duration) * time * time * time * time;
      case 14 /* QuintOut */:
        return (time = time / duration - 1) * time * time * time * time + 1;
      case 15 /* QuintInOut */:
        if ((time /= duration * 0.5) < 1)
          return 0.5 * time * time * time * time * time;
        return 0.5 * ((time -= 2) * time * time * time * time + 2);
      case 16 /* ExpoIn */:
        return time == 0 ? 0 : Math.pow(2, 10 * (time / duration - 1));
      case 17 /* ExpoOut */:
        if (time == duration)
          return 1;
        return -Math.pow(2, -10 * time / duration) + 1;
      case 18 /* ExpoInOut */:
        if (time == 0)
          return 0;
        if (time == duration)
          return 1;
        if ((time /= duration * 0.5) < 1)
          return 0.5 * Math.pow(2, 10 * (time - 1));
        return 0.5 * (-Math.pow(2, -10 * --time) + 2);
      case 19 /* CircIn */:
        return -(Math.sqrt(1 - (time /= duration) * time) - 1);
      case 20 /* CircOut */:
        return Math.sqrt(1 - (time = time / duration - 1) * time);
      case 21 /* CircInOut */:
        if ((time /= duration * 0.5) < 1)
          return -0.5 * (Math.sqrt(1 - time * time) - 1);
        return 0.5 * (Math.sqrt(1 - (time -= 2) * time) + 1);
      case 22 /* ElasticIn */:
        let s0;
        if (time == 0)
          return 0;
        if ((time /= duration) == 1)
          return 1;
        if (period == 0)
          period = duration * 0.3;
        if (overshootOrAmplitude < 1) {
          overshootOrAmplitude = 1;
          s0 = period / 4;
        } else
          s0 = period / _TwoPi * Math.asin(1 / overshootOrAmplitude);
        return -(overshootOrAmplitude * Math.pow(2, 10 * (time -= 1)) * Math.sin((time * duration - s0) * _TwoPi / period));
      case 23 /* ElasticOut */:
        let s1;
        if (time == 0)
          return 0;
        if ((time /= duration) == 1)
          return 1;
        if (period == 0)
          period = duration * 0.3;
        if (overshootOrAmplitude < 1) {
          overshootOrAmplitude = 1;
          s1 = period / 4;
        } else
          s1 = period / _TwoPi * Math.asin(1 / overshootOrAmplitude);
        return overshootOrAmplitude * Math.pow(2, -10 * time) * Math.sin((time * duration - s1) * _TwoPi / period) + 1;
      case 24 /* ElasticInOut */:
        let s;
        if (time == 0)
          return 0;
        if ((time /= duration * 0.5) == 2)
          return 1;
        if (period == 0)
          period = duration * (0.3 * 1.5);
        if (overshootOrAmplitude < 1) {
          overshootOrAmplitude = 1;
          s = period / 4;
        } else
          s = period / _TwoPi * Math.asin(1 / overshootOrAmplitude);
        if (time < 1)
          return -0.5 * (overshootOrAmplitude * Math.pow(2, 10 * (time -= 1)) * Math.sin((time * duration - s) * _TwoPi / period));
        return overshootOrAmplitude * Math.pow(2, -10 * (time -= 1)) * Math.sin((time * duration - s) * _TwoPi / period) * 0.5 + 1;
      case 25 /* BackIn */:
        return (time /= duration) * time * ((overshootOrAmplitude + 1) * time - overshootOrAmplitude);
      case 26 /* BackOut */:
        return (time = time / duration - 1) * time * ((overshootOrAmplitude + 1) * time + overshootOrAmplitude) + 1;
      case 27 /* BackInOut */:
        if ((time /= duration * 0.5) < 1)
          return 0.5 * (time * time * (((overshootOrAmplitude *= 1.525) + 1) * time - overshootOrAmplitude));
        return 0.5 * ((time -= 2) * time * (((overshootOrAmplitude *= 1.525) + 1) * time + overshootOrAmplitude) + 2);
      case 28 /* BounceIn */:
        return bounce_easeIn(time, duration);
      case 29 /* BounceOut */:
        return bounce_easeOut(time, duration);
      case 30 /* BounceInOut */:
        return bounce_easeInOut(time, duration);
      default:
        return -(time /= duration) * (time - 2);
    }
  }
  function bounce_easeIn(time, duration) {
    return 1 - bounce_easeOut(duration - time, duration);
  }
  function bounce_easeOut(time, duration) {
    if ((time /= duration) < 1 / 2.75) {
      return 7.5625 * time * time;
    }
    if (time < 2 / 2.75) {
      return 7.5625 * (time -= 1.5 / 2.75) * time + 0.75;
    }
    if (time < 2.5 / 2.75) {
      return 7.5625 * (time -= 2.25 / 2.75) * time + 0.9375;
    }
    return 7.5625 * (time -= 2.625 / 2.75) * time + 0.984375;
  }
  function bounce_easeInOut(time, duration) {
    if (time < duration * 0.5) {
      return bounce_easeIn(time * 2, duration) * 0.5;
    }
    return bounce_easeOut(time * 2 - duration, duration) * 0.5 + 0.5;
  }

  // src/tween/Tweener.ts
  var s_vec2 = new Vec2();
  var Tweener = class {
    constructor() {
      this._startValue = new TweenValue();
      this._endValue = new TweenValue();
      this._value = new TweenValue();
      this._deltaValue = new TweenValue();
      this._reset();
    }
    setDelay(value) {
      this._delay = value;
      return this;
    }
    get delay() {
      return this._delay;
    }
    setDuration(value) {
      this._duration = value;
      return this;
    }
    get duration() {
      return this._duration;
    }
    setBreakpoint(value) {
      this._breakpoint = value;
      return this;
    }
    setEase(value) {
      this._easeType = value;
      return this;
    }
    setEasePeriod(value) {
      this._easePeriod = value;
      return this;
    }
    setEaseOvershootOrAmplitude(value) {
      this._easeOvershootOrAmplitude = value;
      return this;
    }
    setRepeat(repeat2, yoyo) {
      this._repeat = repeat2;
      this._yoyo = yoyo;
      return this;
    }
    get repeat() {
      return this._repeat;
    }
    setTimeScale(value) {
      this._timeScale = value;
      return this;
    }
    setSnapping(value) {
      this._snapping = value;
      return this;
    }
    setTarget(value, propType) {
      this._target = value;
      this._propType = propType;
      return this;
    }
    get target() {
      return this._target;
    }
    setPath(value) {
      this._path = value;
      return this;
    }
    setUserData(value) {
      this._userData = value;
      return this;
    }
    get userData() {
      return this._userData;
    }
    onUpdate(callback, target) {
      this._onUpdate = callback;
      this._onUpdateCaller = target;
      return this;
    }
    onStart(callback, target) {
      this._onStart = callback;
      this._onStartCaller = target;
      return this;
    }
    onComplete(callback, target) {
      this._onComplete = callback;
      this._onCompleteCaller = target;
      return this;
    }
    get startValue() {
      return this._startValue;
    }
    get endValue() {
      return this._endValue;
    }
    get value() {
      return this._value;
    }
    get deltaValue() {
      return this._deltaValue;
    }
    get normalizedTime() {
      return this._normalizedTime;
    }
    get completed() {
      return this._ended != 0;
    }
    get allCompleted() {
      return this._ended == 1;
    }
    setPaused(paused) {
      this._paused = paused;
      return this;
    }
    /**
     * seek position of the tween, in seconds.
     */
    seek(time) {
      if (this._killed)
        return;
      this._elapsedTime = time;
      if (this._elapsedTime < this._delay) {
        if (this._started)
          this._elapsedTime = this._delay;
        else
          return;
      }
      this.update();
    }
    kill(complete) {
      if (this._killed)
        return;
      if (complete) {
        if (this._ended == 0) {
          if (this._breakpoint >= 0)
            this._elapsedTime = this._delay + this._breakpoint;
          else if (this._repeat >= 0)
            this._elapsedTime = this._delay + this._duration * (this._repeat + 1);
          else
            this._elapsedTime = this._delay + this._duration * 2;
          this.update();
        }
        this.callCompleteCallback();
      }
      this._killed = true;
    }
    _to(start, end, duration) {
      this._valueSize = 1;
      this._startValue.x = start;
      this._endValue.x = end;
      this._value.x = start;
      this._duration = duration;
      return this;
    }
    _to2(start, start2, end, end2, duration) {
      this._valueSize = 2;
      this._startValue.x = start;
      this._endValue.x = end;
      this._startValue.y = start2;
      this._endValue.y = end2;
      this._value.x = start;
      this._value.y = start2;
      this._duration = duration;
      return this;
    }
    _to3(start, start2, start3, end, end2, end3, duration) {
      this._valueSize = 3;
      this._startValue.x = start;
      this._endValue.x = end;
      this._startValue.y = start2;
      this._endValue.y = end2;
      this._startValue.z = start3;
      this._endValue.z = end3;
      this._value.x = start;
      this._value.y = start2;
      this._value.z = start3;
      this._duration = duration;
      return this;
    }
    _to4(start, start2, start3, start4, end, end2, end3, end4, duration) {
      this._valueSize = 4;
      this._startValue.x = start;
      this._endValue.x = end;
      this._startValue.y = start2;
      this._endValue.y = end2;
      this._startValue.z = start3;
      this._endValue.z = end3;
      this._startValue.w = start4;
      this._endValue.w = end4;
      this._value.x = start;
      this._value.y = start2;
      this._value.z = start3;
      this._value.w = start4;
      this._duration = duration;
      return this;
    }
    _toColor(start, end, duration) {
      this._valueSize = 4;
      this._startValue.color = start;
      this._endValue.color = end;
      this._value.color = start;
      this._duration = duration;
      return this;
    }
    _shake(startX, startY, amplitude, duration) {
      this._valueSize = 5;
      this._startValue.x = startX;
      this._startValue.y = startY;
      this._startValue.w = amplitude;
      this._duration = duration;
      return this;
    }
    _init() {
      this._delay = 0;
      this._duration = 0;
      this._breakpoint = -1;
      this._easeType = 5 /* QuadOut */;
      this._timeScale = 1;
      this._easePeriod = 0;
      this._easeOvershootOrAmplitude = 1.70158;
      this._snapping = false;
      this._repeat = 0;
      this._yoyo = false;
      this._valueSize = 0;
      this._started = false;
      this._paused = false;
      this._killed = false;
      this._elapsedTime = 0;
      this._normalizedTime = 0;
      this._ended = 0;
    }
    _reset() {
      this._target = null;
      this._propType = null;
      this._userData = null;
      this._path = null;
      this._onStart = this._onUpdate = this._onComplete = null;
      this._onStartCaller = this._onUpdateCaller = this._onCompleteCaller = null;
    }
    _update(dt) {
      if (this._timeScale != 1) {
        dt *= this._timeScale;
        if (dt == 0)
          return;
      }
      if (this._ended != 0) {
        this.callCompleteCallback();
        this._killed = true;
        return;
      }
      this._elapsedTime += dt;
      this.update();
      if (this._ended != 0) {
        if (!this._killed) {
          this.callCompleteCallback();
          this._killed = true;
        }
      }
    }
    update() {
      this._ended = 0;
      if (this._valueSize == 0) {
        if (this._elapsedTime >= this._delay + this._duration)
          this._ended = 1;
        return;
      }
      if (!this._started) {
        if (this._elapsedTime < this._delay)
          return;
        this._started = true;
        this.callStartCallback();
        if (this._killed)
          return;
      }
      let reversed = false;
      let tt = this._elapsedTime - this._delay;
      if (this._breakpoint >= 0 && tt >= this._breakpoint) {
        tt = this._breakpoint;
        this._ended = 2;
      }
      if (this._repeat != 0) {
        let round = Math.floor(tt / this._duration);
        tt -= this._duration * round;
        if (this._yoyo)
          reversed = round % 2 == 1;
        if (this._repeat > 0 && this._repeat - round < 0) {
          if (this._yoyo)
            reversed = this._repeat % 2 == 1;
          tt = this._duration;
          this._ended = 1;
        }
      } else if (tt >= this._duration) {
        tt = this._duration;
        this._ended = 1;
      }
      this._normalizedTime = evaluateEase(
        this._easeType,
        reversed ? this._duration - tt : tt,
        this._duration,
        this._easeOvershootOrAmplitude,
        this._easePeriod
      );
      this._value.reset();
      this._deltaValue.reset();
      if (this._valueSize == 5) {
        if (this._ended == 0) {
          let r2 = this._startValue.w * (1 - this._normalizedTime);
          let rx = r2 * (Math.random() > 0.5 ? 1 : -1);
          let ry = r2 * (Math.random() > 0.5 ? 1 : -1);
          this._deltaValue.x = rx;
          this._deltaValue.y = ry;
          this._value.x = this._startValue.x + rx;
          this._value.y = this._startValue.y + ry;
        } else {
          this._value.x = this._startValue.x;
          this._value.y = this._startValue.y;
        }
      } else if (this._path) {
        let pt = this._path.getPointAt(this._normalizedTime, s_vec2);
        if (this._snapping) {
          pt.x = Math.round(pt.x);
          pt.y = Math.round(pt.y);
        }
        this._deltaValue.x = pt.x - this._value.x;
        this._deltaValue.y = pt.y - this._value.y;
        this._value.x = pt.x;
        this._value.y = pt.y;
      } else {
        for (let i = 0; i < this._valueSize; i++) {
          let n1 = this._startValue.getField(i);
          let n2 = this._endValue.getField(i);
          let f = n1 + (n2 - n1) * this._normalizedTime;
          if (this._snapping)
            f = Math.round(f);
          this._deltaValue.setField(i, f - this._value.getField(i));
          this._value.setField(i, f);
        }
      }
      if (this._target && this._propType) {
        if (this._propType instanceof Function) {
          switch (this._valueSize) {
            case 1:
              this._propType.call(this._target, this._value.x);
              break;
            case 2:
              this._propType.call(this._target, this._value.x, this._value.y);
              break;
            case 3:
              this._propType.call(this._target, this._value.x, this._value.y, this._value.z);
              break;
            case 4:
              this._propType.call(this._target, this._value.x, this._value.y, this._value.z, this._value.w);
              break;
            case 5:
              this._propType.call(this._target, this._value.color);
              break;
            case 6:
              this._propType.call(this._target, this._value.x, this._value.y);
              break;
          }
        } else {
          if (this._valueSize == 5)
            this._target[this._propType] = this._value.color;
          else
            this._target[this._propType] = this._value.x;
        }
      }
      this.callUpdateCallback();
    }
    callStartCallback() {
      if (this._onStart) {
        try {
          this._onStart.call(this._onStartCaller, this);
        } catch (err) {
          console.warn("error in start callback > " + err);
        }
      }
    }
    callUpdateCallback() {
      if (this._onUpdate) {
        try {
          this._onUpdate.call(this._onUpdateCaller, this);
        } catch (err) {
          console.warn("error in update callback > " + err);
        }
      }
    }
    callCompleteCallback() {
      if (this._onComplete) {
        try {
          this._onComplete.call(this._onCompleteCaller, this);
        } catch (err) {
          console.warn("error in complete callback > " + err);
        }
      }
    }
  };

  // src/tween/TweenManager.ts
  var TweenManager = class _TweenManager {
    static __init__() {
      Timers.addUpdate(_TweenManager.update);
    }
    static createTween() {
      let tweener = _tweenerPool.borrow();
      _activeTweens[_totalActiveTweens++] = tweener;
      return tweener;
    }
    static isTweening(target, propType) {
      if (target == null)
        return false;
      let anyType = !propType;
      for (let i = 0; i < _totalActiveTweens; i++) {
        let tweener = _activeTweens[i];
        if (tweener && tweener.target == target && !tweener._killed && (anyType || tweener._propType == propType))
          return true;
      }
      return false;
    }
    static killTweens(target, completed, propType) {
      if (target == null)
        return false;
      let flag = false;
      let cnt = _totalActiveTweens;
      let anyType = !propType;
      for (let i = 0; i < cnt; i++) {
        let tweener = _activeTweens[i];
        if (tweener && tweener.target == target && !tweener._killed && (anyType || tweener._propType == propType)) {
          tweener.kill(completed);
          flag = true;
        }
      }
      return flag;
    }
    static getTween(target, propType) {
      if (target == null)
        return null;
      let cnt = _totalActiveTweens;
      let anyType = !propType;
      for (let i = 0; i < cnt; i++) {
        let tweener = _activeTweens[i];
        if (tweener && tweener.target == target && !tweener._killed && (anyType || tweener._propType == propType)) {
          return tweener;
        }
      }
      return null;
    }
    static update() {
      let dt = Timers.deltaTime / 1e3;
      let cnt = _totalActiveTweens;
      let freePosStart = -1;
      for (let i = 0; i < cnt; i++) {
        let tweener = _activeTweens[i];
        if (tweener == null) {
          if (freePosStart == -1)
            freePosStart = i;
        } else if (tweener._killed) {
          _tweenerPool.returns(tweener);
          _activeTweens[i] = null;
          if (freePosStart == -1)
            freePosStart = i;
        } else {
          if (tweener._target && "destroyed" in tweener._target && tweener._target.destroyed)
            tweener._killed = true;
          else if (!tweener._paused)
            tweener._update(dt);
          if (freePosStart != -1) {
            _activeTweens[freePosStart] = tweener;
            _activeTweens[i] = null;
            freePosStart++;
          }
        }
      }
      if (freePosStart >= 0) {
        if (_totalActiveTweens != cnt) {
          let j = cnt;
          cnt = _totalActiveTweens - cnt;
          for (let i = 0; i < cnt; i++) {
            _activeTweens[freePosStart++] = _activeTweens[j];
            _activeTweens[j] = null;
            j++;
          }
        }
        _totalActiveTweens = freePosStart;
      }
    }
  };
  var _activeTweens = [];
  var _tweenerPool = new Pool(Tweener, (e) => e._init(), (e) => e._reset());
  var _totalActiveTweens = 0;

  // src/tween/Tween.ts
  var Tween = class {
    static to(start, end, duration) {
      return TweenManager.createTween()._to(start, end, duration);
    }
    static to2(start, start2, end, end2, duration) {
      return TweenManager.createTween()._to2(start, start2, end, end2, duration);
    }
    static to3(start, start2, start3, end, end2, end3, duration) {
      return TweenManager.createTween()._to3(start, start2, start3, end, end2, end3, duration);
    }
    static to4(start, start2, start3, start4, end, end2, end3, end4, duration) {
      return TweenManager.createTween()._to4(start, start2, start3, start4, end, end2, end3, end4, duration);
    }
    static toColor(start, end, duration) {
      return TweenManager.createTween()._toColor(start, end, duration);
    }
    static delayedCall(delay) {
      return TweenManager.createTween().setDelay(delay);
    }
    static shake(startX, startY, amplitude, duration) {
      return TweenManager.createTween()._shake(startX, startY, amplitude, duration);
    }
    static isTweening(target, propType) {
      return TweenManager.isTweening(target, propType);
    }
    static kill(target, complete, propType) {
      TweenManager.killTweens(target, complete, propType);
    }
    static getTween(target, propType) {
      return TweenManager.getTween(target, propType);
    }
  };
  Tween.catchCallbackExceptions = true;

  // src/ui/gear/Gear.ts
  var _Gear = class _Gear {
    constructor() {
      this.values = {};
    }
    get owner() {
      return this._owner;
    }
    set owner(value) {
      this._owner = value;
      if (this._controller) {
        if (value) {
          this._controller.validate();
          this.onChanged(true);
        } else
          this._controller.release();
      }
    }
    get controller() {
      return this._controller;
    }
    set controller(value) {
      if (this._controller)
        this._controller.release();
      this._controller = value;
      if (value) {
        value.onChanged = () => this.onChanged();
        if (this._owner)
          value.validate();
      }
    }
    get propPath() {
      return this._propPath;
    }
    set propPath(value) {
      this._propPath = value;
      this._propPathArr = null;
      this.onChanged(true);
    }
    get tween() {
      return this._tween;
    }
    set tween(value) {
      this._tween = value;
    }
    onChanged(disableTween) {
      if (this._owner && this._controller)
        this.runGear(disableTween);
    }
    getValue(page) {
      let value = this.values[page];
      if (value === void 0 && page != 0) {
        value = this.values[0];
        if (value != null && typeof value === "object" && typeof value.clone === "function")
          value = value.clone();
      }
      return value;
    }
    doTween(obj, key, oldValue, newValue) {
      let tc = this._tween;
      if (this._tweener) {
        this._tweener.kill(true);
        this._tweener = null;
      }
      this._tweener = Tween.to(0, 1, tc.duration).setDelay(tc.delay).setTarget(this).onComplete(() => {
        this._tweener = null;
        obj[key] = newValue;
      });
    }
    runGear(disableTween) {
      let arr = this._propPathArr;
      if (!arr) {
        if (!this._propPath)
          return;
        arr = this._propPathArr = this._propPath.split(".");
      }
      let obj = this._owner;
      let cnt = arr.length;
      for (let i = 0; i < cnt - 1; i++) {
        obj = obj[arr[i]];
        if (obj == null)
          return;
      }
      let key = arr[cnt - 1];
      if (this.values[0] === void 0)
        this.values[0] = obj[key];
      let newValue = this.getValue(this._controller.selectedIndex);
      if (newValue !== void 0) {
        if (disableTween || !this._tween || !this._tween.enabled || _Gear.disableAllTweenEffect || this._owner._getBit(NodeFlags.EDITING_NODE))
          obj[key] = newValue;
        else {
          let oldValue = obj[key];
          if (oldValue == null)
            obj[key] = newValue;
          else
            this.doTween(obj, key, oldValue, newValue);
        }
      }
    }
  };
  _Gear.disableAllTweenEffect = false;
  var Gear = _Gear;
  var GearString = class extends Gear {
  };
  var GearBool = class extends Gear {
  };

  // src/ui/gear/GearTweenConfig.ts
  var GearTweenConfig = class {
    constructor() {
      this.enabled = true;
      this.easeType = 5 /* QuadOut */;
      this.duration = 0.3;
      this.delay = 0;
    }
  };

  // src/ui/gear/GearDisplay.ts
  var GearDisplay = class _GearDisplay extends Gear {
    constructor() {
      super();
      this._flag = true;
      this._condition = 0;
      this._pages = [];
      this._propPath = "internalVisible";
    }
    get pages() {
      return this._pages;
    }
    set pages(value) {
      this._pages = value;
      this.onChanged(true);
    }
    get condition() {
      return this._condition;
    }
    set condition(value) {
      this._condition = value;
      this.onChanged(true);
    }
    get delay() {
      return this._tween ? this._tween.duration : 0;
    }
    set delay(value) {
      if (value > 0) {
        if (!this._tween)
          this._tween = new GearTweenConfig();
        this._tween.duration = value;
      } else
        this._tween = null;
    }
    doTween(obj, key, oldValue, newValue) {
      if (!newValue)
        super.doTween(obj, key, oldValue, newValue);
      else
        obj[key] = newValue;
    }
    getValue(page) {
      this._flag = page == -1 || this._pages.length == 0 || this._pages.indexOf(page) != -1;
      return _GearDisplay.check(this._owner);
    }
    static check(owner) {
      let r2;
      for (let g of owner.gears) {
        if (g instanceof _GearDisplay) {
          if (r2 == null)
            r2 = g._flag;
          else if (g._condition == 0)
            r2 = r2 && g._flag;
          else
            r2 = r2 || g._flag;
        }
      }
      return r2 != null ? r2 : true;
    }
  };

  // src/ui/Widget.ts
  var Widget = class _Widget extends EventDispatcher {
    constructor() {
      super();
      this._name = "";
      this._bits = 0;
      this._hideFlags = 0;
      this._width = 0;
      this._height = 0;
      this._visible = true;
      this._visible2 = true;
      this._active = true;
      this._touchable = true;
      this._touchThrough = false;
      this._destroyed = false;
      this._zOrder = 0;
      this._childrenRenderOrder = 0;
      this._apexIndex = 0;
      this._asGroup = false;
      this._draggable = false;
      this._focusable = true;
      this._tabStop = false;
      this._tabStopChildren = false;
      this._zSortings = 0;
      /** @internal */
      this._rawWidth = 0;
      /** @internal */
      this._rawHeight = 0;
      /** @internal */
      this._deltaWidth = 0;
      /** @internal */
      this._deltaHeight = 0;
      this._giveWidth = 0;
      this._giveHeight = 0;
      this.sourceWidth = 0;
      this.sourceHeight = 0;
      this._id = "" + idCounter++;
      this._extra = {};
      this._children = [];
      this._components = [];
      this._controllers = {};
      this._gears = [];
      this._relations = [];
      this._controllerCount = 0;
      this._initialize();
      this.createElement();
      this._element.owner = this;
      if (!this._container)
        this._container = this._element;
    }
    static findOwnerWidget(element) {
      while (element) {
        if (element.owner instanceof gui.Widget)
          return element.owner;
        if (element.parentElement) {
          element = element.parentElement;
          continue;
        }
        const root = element.getRootNode();
        element = root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null;
      }
      return null;
    }
    get id() {
      return this._id;
    }
    get name() {
      return this._name;
    }
    set name(value) {
      if (value == null)
        value = "";
      this._name = value;
      this._element.name = value;
    }
    get hideFlags() {
      return this._hideFlags;
    }
    set hideFlags(value) {
      this._hideFlags = value;
    }
    get x() {
      return this._element._x;
    }
    set x(value) {
      this.setPos(value, this._element._y);
    }
    get y() {
      return this._element._y;
    }
    set y(value) {
      this.setPos(this._element._x, value);
    }
    setPos(xv, yv) {
      if (this._element._x == xv && this._element._y == yv)
        return this;
      this._element.setPos(xv, yv);
      if (this._parent)
        this._parent.setLayoutChangedFlag(1 /* Pos */);
      this.emit("pos_changed");
      return this;
    }
    get left() {
      return this._element._x - this._width * this._element._anchorX;
    }
    set left(value) {
      this.setPos(value + this._width * this._element._anchorX, this._element.y);
    }
    get top() {
      return this._element._y - this._height * this._element._anchorY;
    }
    set top(value) {
      this.setPos(this._element._x, value + this._height * this._element._anchorY);
    }
    setLeftTop(xv, yv) {
      xv = xv != null ? xv + this._width * this._element._anchorX : this._element._x;
      yv = yv != null ? yv + this._height * this._element._anchorY : this._element._y;
      this.setPos(xv, yv);
      return this;
    }
    center(target) {
      let r2 = target;
      if (!r2) {
        if (this._parent)
          r2 = this._parent;
        else
          r2 = this.findRoot();
      }
      this.setLeftTop(Math.floor((r2.width - this.width) * 0.5), Math.floor((r2.height - this.height) * 0.5));
      return this;
    }
    get width() {
      return this._width;
    }
    set width(value) {
      this.setSize(value, this._rawHeight);
    }
    get height() {
      return this._height;
    }
    set height(value) {
      this.setSize(this._rawWidth, value);
    }
    setSize(wv, hv, changeByLayout) {
      if (this._width == wv && this._height == hv) {
        if (this._forceSizeFlag)
          this._forceSizeFlag = false;
        else
          return this;
      }
      this._rawWidth = wv;
      this._rawHeight = hv;
      if (!changeByLayout) {
        this._giveWidth = wv;
        this._giveHeight = hv;
      }
      if (wv < 0)
        wv = 0;
      if (hv < 0)
        hv = 0;
      this._deltaWidth = wv - this._width;
      this._deltaHeight = hv - this._height;
      this._width = wv;
      this._height = hv;
      this._element.setSize(wv, hv);
      this.setLayoutChangedFlag();
      this._sizeChanged(changeByLayout);
      if (this._graphics)
        this._graphics.refresh();
      if (this._parent) {
        if (this._relations.length > 0) {
          for (let item of this._relations)
            item.applyOnSelfResized();
        }
        this._parent.setLayoutChangedFlag(0 /* Size */);
      }
      this.emit("size_changed");
      this._deltaWidth = 0;
      this._deltaHeight = 0;
      return this;
    }
    makeFullSize(target, constraints) {
      let r2 = target;
      if (!r2) {
        if (this._parent)
          r2 = this._parent;
        else
          r2 = this.findRoot();
      }
      this.setSize(r2.width, r2.height);
      if (constraints)
        this.addRelation(r2, 100 /* Size */);
      return this;
    }
    get scaleX() {
      return this._element.scaleX;
    }
    set scaleX(value) {
      this._element.scaleX = value;
    }
    get scaleY() {
      return this._element.scaleY;
    }
    set scaleY(value) {
      this._element.scaleY = value;
    }
    setScale(xv, yv) {
      this._element.setScale(xv, yv);
    }
    get anchorX() {
      return this._element.anchorX;
    }
    set anchorX(value) {
      this._element.anchorX = value;
    }
    get anchorY() {
      return this._element.anchorY;
    }
    set anchorY(value) {
      this._element.anchorY = value;
    }
    setAnchor(xv, yv) {
      this._element.setAnchor(xv, yv);
    }
    get touchable() {
      return this._touchable;
    }
    set touchable(value) {
      if (this._touchable != value) {
        this._touchable = value;
        this._processTouchable();
      }
    }
    get touchThrough() {
      return this._touchThrough;
    }
    set touchThrough(value) {
      if (this._touchThrough != value) {
        this._touchThrough = value;
        this._processTouchable();
      }
    }
    get grayed() {
      return this._element.grayed;
    }
    set grayed(value) {
      this._element.grayed = value;
    }
    get enabled() {
      return !this.grayed && this.touchable;
    }
    set enabled(value) {
      this.grayed = !value;
      this.touchable = value;
    }
    get rotation() {
      return this._element.rotation;
    }
    set rotation(value) {
      this._element.rotation = value;
    }
    get alpha() {
      return this._element.alpha;
    }
    set alpha(value) {
      this._element.alpha = value;
    }
    get visible() {
      return this._visible;
    }
    set visible(value) {
      this._visible = !!value;
      this._processVisible();
    }
    /** @internal */
    get internalVisible() {
      return this._visible2;
    }
    /** @internal */
    set internalVisible(value) {
      this._visible2 = value;
      this._processVisible();
    }
    get active() {
      return this._active;
    }
    set active(value) {
      value = !!value;
      if (this._active !== value) {
        this._active = value;
        if (this._parent && this._parent.activeInHierarchy) {
          this.prepareActiveChangeList(value);
          this._processActive(value, true);
        }
      }
    }
    get activeInHierarchy() {
      return this._getBit(NodeFlags.ACTIVE_INHIERARCHY);
    }
    get onStage() {
      return this._getBit(NodeFlags.ON_STAGE);
    }
    get zOrder() {
      return this._zOrder;
    }
    set zOrder(value) {
      if (value < 0)
        value = 0;
      if (this._zOrder != value) {
        let old = this._zOrder;
        this._zOrder = value;
        if (this._parent)
          this._parent.childSortingOrderChanged(this, old, this._zOrder);
      }
    }
    get childrenRenderOrder() {
      return this._childrenRenderOrder;
    }
    set childrenRenderOrder(value) {
      if (this._childrenRenderOrder != value) {
        this._childrenRenderOrder = value;
        Timers.callLater(this._buildDisplayList, this);
      }
    }
    get apexIndex() {
      return this._apexIndex;
    }
    set apexIndex(value) {
      if (this._apexIndex != value) {
        this._apexIndex = value;
      }
    }
    get tooltips() {
      return this._tooltips;
    }
    set tooltips(value) {
      if (this._tooltips) {
        this.off("roll_over", this._rollOver, this);
        this.off("roll_out", this._rollOut, this);
      }
      this._tooltips = value;
      if (this._tooltips) {
        this.on("roll_over", this._rollOver, this);
        this.on("roll_out", this._rollOut, this);
      }
    }
    _rollOver() {
      this.findRoot().popupMgr.showTooltips(this._tooltips, UIConfig.defaultTooltipsShowDelay);
    }
    _rollOut() {
      this.findRoot().popupMgr.hideTooltips();
    }
    get focusable() {
      return this._focusable;
    }
    set focusable(value) {
      this._focusable = value;
    }
    get tabStop() {
      return this._tabStop;
    }
    set tabStop(value) {
      if (this._tabStop != value) {
        this._tabStop = value;
        if (value) {
          this._element.tabIndex = 0;
          this.on("native_focus", this._focusEventHandler, this);
        } else
          this._element.tabIndex = -1;
      }
    }
    get tabStopChildren() {
      return this._tabStopChildren;
    }
    set tabStopChildren(value) {
      this._tabStopChildren = value;
    }
    get focused() {
      let groot = this.findRoot();
      return groot.inputMgr.focus == this || this.isAncestorOf(groot.inputMgr.focus);
    }
    requestFocus() {
      if (this.onStage)
        this.findRoot().inputMgr.setFocus(this);
    }
    _focusEventHandler() {
      if (this._tabStop)
        this.findRoot().inputMgr.setFocus(this);
    }
    get cursor() {
      return this._cursor;
    }
    set cursor(value) {
      this._cursor = value;
    }
    get text() {
      return "";
    }
    set text(value) {
    }
    get icon() {
      return null;
    }
    set icon(value) {
    }
    get element() {
      return this._element;
    }
    get container() {
      return this._container;
    }
    get destroyed() {
      return this._destroyed;
    }
    get draggable() {
      return this._draggable;
    }
    set draggable(value) {
      if (this._draggable != value) {
        this._draggable = value;
        if (value || this._dragSupport)
          this.dragSupport.setAutoStart(value);
      }
    }
    get dragSupport() {
      return this._dragSupport || (this._dragSupport = new DragSupport(this));
    }
    get nativeDraggable() {
      return this._element.draggable;
    }
    set nativeDraggable(value) {
      this._element.draggable = value;
    }
    get dragBounds() {
      return this._dragBounds;
    }
    set dragBounds(value) {
      this._dragBounds = value;
    }
    startDrag(pointerId) {
      if (!this.onStage)
        return;
      if (pointerId == null)
        pointerId = -1;
      this.dragSupport.start(pointerId);
    }
    stopDrag() {
      this._dragSupport?.stop();
    }
    get dragging() {
      return DragSupport.draggingInst == this;
    }
    get relations() {
      return this._relations;
    }
    /** @internal */
    set relations(value) {
      if (this._relations.length > 0)
        this._relations.filter((g) => !value.includes(g)).forEach((g) => g.owner = null);
      this._relations = value;
      value.forEach((g) => g.owner = this);
    }
    /** @internal */
    _addRelations(value) {
      for (let v of value) {
        v.owner = this;
        this._relations.push(v);
      }
    }
    addRelation(target, type, percent) {
      let item = this._relations.find((i) => i.target == target);
      if (!item) {
        item = new Relation();
        item.owner = this;
        item.target = target;
        this._relations.push(item);
      }
      item.add(type, percent);
      return this;
    }
    removeRelation(target, type) {
      let item = this._relations.find((i) => i.target == target);
      if (item)
        item.remove(type);
      return this;
    }
    clearRelations() {
      this._relations.length = 0;
      return this;
    }
    get controllers() {
      return this._controllers;
    }
    get controllerCount() {
      return this._controllerCount;
    }
    /** @internal */
    set controllers(value) {
      this._controllers = value;
      let i = 0;
      for (let k in value) {
        value[k].name = k;
        value[k].owner = this;
        i++;
      }
      this._controllerCount = i;
      this._controllersChanged();
    }
    addController(name, pageCount) {
      if (this._controllers[name]) {
        console.warn(`controller ${name} already exists`);
        return this._controllers[name];
      }
      let c = new Controller();
      c.name = name;
      c.owner = this;
      if (pageCount != null)
        c.numPages = pageCount;
      this._controllers[name] = c;
      this._controllerCount++;
      this._controllersChanged();
      return c;
    }
    getController(name) {
      return this._controllers[name];
    }
    setPage(controllerName, page) {
      let c = this._controllers[controllerName];
      if (!c)
        return;
      if (typeof page === "number")
        c.selectedIndex = page;
      else
        c.selectedPage = page;
    }
    _controllersChanged() {
      this.emit("controllers_changed");
    }
    get gears() {
      return this._gears;
    }
    /** @internal */
    set gears(value) {
      let visChanged;
      if (this._gears.length > 0) {
        this._gears.filter((g) => !value.includes(g)).forEach((g) => {
          if (g instanceof GearDisplay)
            visChanged = true;
          g.owner = null;
        });
      }
      this._gears = value;
      value.forEach((g) => g.owner = this);
      if (visChanged)
        this.internalVisible = GearDisplay.check(this);
    }
    /** @internal */
    _addGears(value) {
      this._gears.push(...value);
      value.forEach((g) => g.owner = this);
    }
    addGear(value) {
      this._gears.push(value);
      value.owner = this;
    }
    removeGear(value) {
      let i = this._gears.indexOf(value);
      if (i != -1) {
        this._gears.splice(i, 1);
        value.owner = null;
      }
    }
    destroy() {
      this._destroyed = true;
      for (let k in this._controllers)
        this._controllers[k].offAll();
      for (let g of this._gears)
        g.owner = null;
      if (this._graphics)
        this._graphics.owner = null;
      for (let c of this._components)
        c && !c.destroyed && c._destroy();
      this._components.length = 0;
      for (let i = this._children.length - 1; i >= 0; --i) {
        let obj = this._children[i];
        obj._parent = null;
        obj.destroy();
      }
      this.removeSelf();
      this.onDestroy();
      this.offAll();
    }
    onStartListeningToType(type) {
      switch (type) {
        case "native_dragstart":
        case "native_dragover":
        case "native_dragend":
        case "native_dragleave":
        case "native_drop":
          this._element.addEventListener(type.substring(7), (evt) => {
            Event._lastInput.x = evt.pageX;
            Event._lastInput.y = evt.pageY;
            this.emit(type, evt.dataTransfer, evt);
          });
          break;
        case "native_focus":
          this._element.addEventListener("focus", (evt) => {
            this.emit(type, evt.relatedTarget, evt);
          });
          break;
      }
    }
    onClick(listener, target) {
      this.on("click", listener, target);
    }
    offClick(listener, target) {
      this.off("click", listener, target);
    }
    localToGlobal(ax, ay, out) {
      ax = ax || 0;
      ay = ay || 0;
      return this._element.localToGlobal(ax, ay, out);
    }
    globalToLocal(ax, ay, out) {
      ax = ax || 0;
      ay = ay || 0;
      out = this._element.globalToLocal(ax, ay, out);
      return out;
    }
    localToRoot(ax, ay, out) {
      let groot = this.findRoot();
      let pt = this.localToGlobal(ax, ay, out);
      return groot.globalToLocal(pt.x, pt.y, pt);
    }
    rootToLocal(ax, ay, out) {
      let groot = this.findRoot();
      let pt = groot.localToGlobal(ax, ay, out);
      return this.globalToLocal(pt.x, pt.y, pt);
    }
    localToGlobalRect(ax, ay, aWidth, aHeight, out) {
      if (!out)
        out = new Rect();
      this.localToGlobal(ax, ay, s_vec22);
      out.x = s_vec22.x;
      out.y = s_vec22.y;
      this.localToGlobal(ax + aWidth, ay + aHeight, s_vec22);
      out.xMax = s_vec22.x;
      out.yMax = s_vec22.y;
      return out;
    }
    globalToLocalRect(ax, ay, aWidth, aHeight, out) {
      if (!out)
        out = new Rect();
      this.globalToLocal(ax, ay, s_vec22);
      out.x = s_vec22.x;
      out.y = s_vec22.y;
      this.globalToLocal(ax + aWidth, ay + aHeight, s_vec22);
      out.xMax = s_vec22.x;
      out.yMax = s_vec22.y;
      return out;
    }
    transformRect(ax, ay, aWidth, aHeight, targetSpace, out) {
      if (!out)
        out = new Rect();
      this.localToGlobal(ax, ay, s_vec22);
      if (targetSpace)
        targetSpace.globalToLocal(s_vec22.x, s_vec22.y, s_vec22);
      out.x = s_vec22.x;
      out.y = s_vec22.y;
      this.localToGlobal(ax + aWidth, ay + aHeight, s_vec22);
      if (targetSpace)
        targetSpace.globalToLocal(s_vec22.x, s_vec22.y, s_vec22);
      out.xMax = s_vec22.x;
      out.yMax = s_vec22.y;
      return out;
    }
    hitTest(x, y) {
      this.globalToLocal(x, y, s_vec22);
      s_rect2.set(0, 0, this._width, this._height);
      return s_rect2.contains(s_vec22);
    }
    createElement() {
      this._element = UIElement.create();
    }
    _sizeChanged(changeByLayout) {
    }
    setLayoutChangedFlag(reason) {
    }
    /** @internal */
    _initialize() {
    }
    _setBit(bit, value) {
      if ((this._bits & bit) === 0 === !value)
        return;
      if (value)
        this._bits |= bit;
      else
        this._bits &= ~bit;
      if (value && (bit & NodeFlags.EDITING_NODE) !== 0) {
        if (!this.element.visible) {
          this.element.style.display = "";
          this.element.visible = false;
        }
      }
    }
    _getBit(type) {
      return (this._bits & type) != 0;
    }
    hasHideFlag(flag) {
      return (this._hideFlags & flag) != 0;
    }
    get asGroup() {
      return !!this._asGroup;
    }
    set asGroup(value) {
      this._asGroup = !!value;
    }
    addChild(child) {
      return this.addChildAt(child, this._children.length);
    }
    addChildAt(child, index) {
      if (index >= 0 && index <= this._children.length) {
        if (child._parent == this) {
          this.setChildIndex(child, index);
        } else {
          child._parent && child._parent.removeChild(child);
          let cnt = this._children.length;
          if (child._zOrder != 0) {
            this._zSortings++;
            index = this.getInsertPosForSortingChild(child);
          } else if (this._zSortings > 0) {
            if (index > cnt - this._zSortings)
              index = cnt - this._zSortings;
          }
          if (index == cnt) {
            this._children.push(child);
            if (this._childrenRenderOrder == 0 /* Ascent */)
              this._container.appendChild(child._element);
            else if (this._childrenRenderOrder == 1 /* Descent */)
              this._container.prepend(child._element);
            else {
              this._container.appendChild(child._element);
              if (cnt + 1 > this._apexIndex)
                Timers.callLater(this._buildDisplayList, this);
            }
          } else {
            let refNode = this._children[index]._element;
            this._children.splice(index, 0, child);
            if (this._childrenRenderOrder == 0 /* Ascent */)
              this._container.insertBefore(child._element, refNode);
            else if (this._childrenRenderOrder == 1 /* Descent */)
              refNode.insertAdjacentElement("afterend", child._element);
            else {
              this._container.appendChild(child._element);
              if (cnt + 1 > this._apexIndex)
                Timers.callLater(this._buildDisplayList, this);
            }
          }
          child._setParent(this);
          this.setLayoutChangedFlag(3 /* Hierarchy */);
        }
        return child;
      } else {
        throw new Error(`invalid child index: ${index}`);
      }
    }
    getChildIndex(child) {
      return this._children.indexOf(child);
    }
    getChildAt(index, classType) {
      if (index >= 0 && index < this.numChildren)
        return this._children[index];
      else
        throw new Error(`invalid child index: ${index}`);
    }
    getChild(name, classType) {
      for (let c of this._children) {
        if (c.name == name)
          return c;
        if (c._asGroup) {
          c = c.getChild(name, classType);
          if (c)
            return c;
        }
      }
      return null;
    }
    findChild(name, classType) {
      for (let c of this._children) {
        if (c.name == name)
          return c;
        if (!c.prefabUrl) {
          c = c.findChild(name, classType);
          if (c)
            return c;
        }
      }
      return null;
    }
    getChildByPath(path, classType) {
      let arr = path.split(".");
      let cnt = arr.length;
      let p = this;
      let obj;
      for (let i = 0; i < cnt; ++i) {
        obj = p.getChild(arr[i], classType);
        if (!obj)
          break;
        p = obj;
      }
      return obj;
    }
    setChildIndex(child, index) {
      let oldIndex = this._children.indexOf(child);
      if (oldIndex == -1)
        throw new Error("Not a child of this container");
      if (child._zOrder != 0)
        return child;
      if (this._zSortings > 0) {
        let cnt = this._children.length;
        if (index > cnt - this._zSortings - 1)
          index = cnt - this._zSortings - 1;
      }
      this._setChildIndex(child, oldIndex, index);
      return child;
    }
    setChildIndexBefore(child, index) {
      let oldIndex = this._children.indexOf(child);
      if (oldIndex == -1)
        throw "Not a child of this container";
      if (child._zOrder != 0)
        return oldIndex;
      if (this._zSortings > 0) {
        let cnt = this._children.length;
        if (index > cnt - this._zSortings - 1)
          index = cnt - this._zSortings - 1;
      }
      if (oldIndex < index)
        return this._setChildIndex(child, oldIndex, index - 1);
      else
        return this._setChildIndex(child, oldIndex, index);
    }
    /**
     * @internal
     */
    _setChildIndex(child, oldIndex, index) {
      let cnt = this._children.length;
      if (index > cnt)
        index = cnt;
      if (oldIndex == index)
        return oldIndex;
      this._children.splice(oldIndex, 1);
      if (index >= this._children.length) {
        this._children.push(child);
        if (this._childrenRenderOrder == 0 /* Ascent */)
          this._container.appendChild(child._element);
        else if (this._childrenRenderOrder == 1 /* Descent */)
          this._container.prepend(child._element);
        else {
          this._container.appendChild(child._element);
          if (cnt + 1 > this._apexIndex)
            Timers.callLater(this._buildDisplayList, this);
        }
      } else {
        this._children.splice(index, 0, child);
        let refNode = this._children[index + 1]._element;
        if (this._childrenRenderOrder == 0 /* Ascent */)
          this._container.insertBefore(child._element, refNode);
        else if (this._childrenRenderOrder == 1 /* Descent */)
          refNode.insertAdjacentElement("afterend", child._element);
        else {
          this._container.insertBefore(child._element, refNode);
          if (cnt + 1 > this._apexIndex)
            Timers.callLater(this._buildDisplayList, this);
        }
      }
      this.setLayoutChangedFlag(3 /* Hierarchy */);
      this._childrenChanged();
      return index;
    }
    removeChild(child, destroy) {
      let index = this._children.indexOf(child);
      return this.removeChildAt(index, destroy);
    }
    removeChildAt(index, destroy) {
      let child = this.getChildAt(index);
      this._container.removeChild(child._element);
      this._children.splice(index, 1);
      child._setParent(null);
      if (child._zOrder != 0)
        this._zSortings--;
      if (this._childrenRenderOrder == 2 /* Arch */)
        Timers.callLater(this._buildDisplayList, this);
      this.setLayoutChangedFlag(3 /* Hierarchy */);
      if (destroy)
        child.destroy();
      return child;
    }
    removeChildren(beginIndex, endIndex, destroy) {
      beginIndex = beginIndex || 0;
      if (endIndex == null)
        endIndex = -1;
      if (endIndex < 0 || endIndex >= this._children.length)
        endIndex = this._children.length - 1;
      for (let i = beginIndex; i <= endIndex; ++i)
        this.removeChildAt(beginIndex, destroy);
    }
    removeSelf() {
      this._parent && this._parent.removeChild(this);
    }
    get children() {
      return this._children;
    }
    get numChildren() {
      return this._children.length;
    }
    /** @internal */
    _buildDisplayList() {
      let cnt = this._children.length;
      if (cnt == 0)
        return;
      switch (this._childrenRenderOrder) {
        case 0 /* Ascent */:
          {
            for (let i = 0; i < cnt; i++) {
              let g = this._children[i];
              this._container.appendChild(g.element);
            }
          }
          break;
        case 1 /* Descent */:
          {
            for (let i = cnt - 1; i >= 0; i--) {
              let g = this._children[i];
              this._container.appendChild(g.element);
            }
          }
          break;
        case 2 /* Arch */:
          {
            let apex = clamp(this._apexIndex, 0, cnt);
            for (let i = 0; i < apex; i++) {
              let g = this._children[i];
              this._container.appendChild(g.element);
            }
            for (let i = cnt - 1; i >= apex; i--) {
              let g = this._children[i];
              this._container.appendChild(g.element);
            }
          }
          break;
      }
    }
    get parent() {
      return this._parent;
    }
    findRoot() {
      let p = this;
      while (p) {
        if ("inputMgr" in p)
          return p;
        p = p.findParent();
      }
      return _Widget._defaultRoot;
    }
    findParent() {
      if (this._parent)
        return this._parent;
      let ele = this.element.getRootNode();
      if (ele && ele instanceof ShadowRoot)
        ele = ele.host;
      else
        ele = this.element.parentElement;
      while (ele) {
        if (ele.owner)
          return ele.owner;
        ele = ele.parentElement;
      }
      return null;
    }
    isAncestorOf(child) {
      if (!child)
        return false;
      let p = child._parent;
      while (p) {
        if (p == this)
          return true;
        p = p._parent;
      }
      return false;
    }
    /** @internal */
    _setParent(newParent) {
      if (this._parent == newParent)
        return;
      let p;
      let b1 = newParent != null;
      if (b1)
        this._parent = p = newParent;
      else {
        p = this._parent;
        this._parent = null;
      }
      let b2 = (p._bits & NodeFlags.ACTIVE_INHIERARCHY) != 0 && this._active;
      let b3 = (p._bits & NodeFlags.ON_STAGE) != 0;
      if (b2 || b3) {
        this.prepareActiveChangeList(b1);
        if (b1) {
          if (b3)
            this._processAddRemove(b1);
          if (b2)
            this._processActive(b1);
        } else {
          if (b2)
            this._processActive(b1);
          if (b3)
            this._processAddRemove(b1);
        }
      }
      p._childrenChanged(this);
    }
    prepareActiveChangeList(active) {
      let arr = this._changeList;
      if (!arr)
        arr = this._changeList = [];
      else
        arr.length = 0;
      this._prepareActiveChangeList(active, arr);
      return arr;
    }
    /** @internal */
    _prepareActiveChangeList(active, out) {
      for (let child of this._children) {
        let b = active && child._active;
        if ((child._bits & NodeFlags.ACTIVE_INHIERARCHY) != 0 != b)
          child._prepareActiveChangeList(b, out);
      }
      this._setBit(NodeFlags.ACTIVE_INHIERARCHY, active);
      out.push(this);
    }
    _processActive(active, fromSetter) {
      let arr = this._changeList;
      if (active) {
        for (let node of arr) {
          if ((node._bits & NodeFlags.AWAKED) == 0 && (node._bits & NodeFlags.ACTIVE_INHIERARCHY) != 0) {
            node._setBit(NodeFlags.AWAKED, true);
            node.onAwake();
          }
        }
        for (let node of arr) {
          if ((node._bits & NodeFlags.ACTIVE_INHIERARCHY) != 0 && (node._bits & NodeFlags.ENABLED) == 0) {
            node._setBit(NodeFlags.ENABLED, true);
            node.onEnable();
            for (let i = 0, n = node._components.length; i < n; i++) {
              let comp = node._components[i];
              comp._enabled && comp._setActive(true);
            }
          }
        }
      } else {
        for (let node of arr) {
          if ((node._bits & NodeFlags.ACTIVE_INHIERARCHY) == 0 && (node._bits & NodeFlags.ENABLED) != 0) {
            node._setBit(NodeFlags.ENABLED, false);
            node.onDisable();
            for (let i = 0, n = node._components.length; i < n; i++) {
              let comp = node._components[i];
              comp._enabled && comp._setActive(false);
            }
          }
        }
      }
    }
    _processAddRemove(add) {
      for (let node of this._changeList) {
        if ((node._bits & NodeFlags.ON_STAGE) != 0 !== add) {
          node._setBit(NodeFlags.ON_STAGE, add);
          if (add)
            node.emit("added_to_stage");
          else
            node.emit("removed_from_stage");
        }
      }
    }
    _processVisible() {
      let v = (this._visible && !this._getBit(NodeFlags.FORCE_HIDDEN) || this._getBit(NodeFlags.FORCE_VISIBLE)) && this._visible2;
      if (v != this._element.visible) {
        this._element.visible = v;
        if (this._parent)
          this._parent.setLayoutChangedFlag(2 /* Visible */);
      }
    }
    _processTouchable() {
      this._element.touchable = this._touchable;
      this._element.touchThrough = this._touchThrough;
    }
    _setGraphics(value) {
      if (this._graphics)
        this._graphics.owner = null;
      this._graphics = value;
      if (value) {
        value.owner = this._element;
        value.refresh();
      } else
        this._element.clearBackgroundStyle();
    }
    childSortingOrderChanged(child, oldValue, newValue) {
      if (newValue == 0) {
        this._zSortings--;
        this.setChildIndex(child, this._children.length);
      } else {
        if (oldValue == 0)
          this._zSortings++;
        let oldIndex = this._children.indexOf(child);
        let index = this.getInsertPosForSortingChild(child);
        if (oldIndex < index)
          this._setChildIndex(child, oldIndex, index - 1);
        else
          this._setChildIndex(child, oldIndex, index);
      }
    }
    getInsertPosForSortingChild(target) {
      let cnt = this._children.length;
      let i;
      for (i = 0; i < cnt; i++) {
        let child = this._children[i];
        if (child == target)
          continue;
        if (target._zOrder < child._zOrder)
          break;
      }
      return i;
    }
    getChildrenBounds(recursive, ignoreInvisibles, ignoreScale, out) {
      out = out || new Rect();
      out.set(0, 0, 0, 0);
      if (this._children.length > 0) {
        for (let child of this._children) {
          if (ignoreInvisibles && !child._element.visible || child._getBit(NodeFlags.ESCAPE_LAYOUT))
            continue;
          if (ignoreScale) {
            s_rect2.set(child.left, child.top, child._width, child._height);
          } else {
            let w = child._width * Math.abs(child.scaleX);
            let h = child._height * Math.abs(child.scaleY);
            s_rect2.set(child._element._x - w * child._element._anchorX, child._element._y - h * child._element._anchorY, w, h);
          }
          out.union(s_rect2, out);
          if (recursive && child._children.length > 0 && !child.element.clipping) {
            let rect = rectPool.borrow();
            child.getChildrenBounds(recursive, ignoreInvisibles, ignoreScale, rect);
            rect.x += child.x;
            rect.y += child.y;
            out.union(rect, out);
            rectPool.returns(rect);
          }
        }
      }
      return out;
    }
    addComponent(type) {
      let comp = new type();
      if (!comp)
        throw new Error(type.toString() + " not exists");
      if (this.getComponent(type))
        throw new Error(`already added: ${type}`);
      this._addComponent(comp);
      return comp;
    }
    getComponent(type) {
      return this._components.find((c) => c instanceof type);
    }
    get components() {
      return this._components;
    }
    /** @internal */
    _addComponent(comp) {
      this._components.push(comp);
      comp._setOwner(this);
      if (this._getBit(NodeFlags.ACTIVE_INHIERARCHY))
        comp._setActive(true);
      this._componentsChanged(comp, 0);
    }
    /** @internal */
    _destroyComponent(comp) {
      let i = this._components.indexOf(comp);
      if (i != -1) {
        this._components.splice(i, 1);
        comp._destroy();
        this._componentsChanged(comp, 1);
      }
    }
    /** @internal */
    _childrenChanged(child) {
    }
    /** @internal */
    _componentsChanged(comp, action) {
    }
    /** @internal */
    _onConstruct(inPrefab) {
      if (inPrefab && this._relations.length > 0) {
        for (let r2 of this._relations) {
          r2._sw = this._width;
          r2._sh = this._height;
          if (r2.target)
            r2.target._forceSizeFlag = true;
        }
      }
      this.onConstruct();
    }
    onAwake() {
    }
    onEnable() {
    }
    onDisable() {
    }
    onDestroy() {
    }
    onConstruct() {
    }
    onAfterDeserialize() {
      if (SerializeUtil.hasProp("_startPages")) {
        let col = this._startPages;
        if (col) {
          for (let k in col) {
            let c = this.getController(k);
            if (c)
              c.selectedIndex = col[k];
          }
        }
      }
    }
  };
  var s_vec22 = new Vec2();
  var s_rect2 = new Rect();
  var rectPool = new Pool(Rect, (r2) => r2.set(0, 0, 0, 0));
  var idCounter = 0;

  // src/display/SGraphics.ts
  var SGraphics = class {
    constructor() {
      this.sizeSensitive = false;
      this.empty = true;
    }
    get owner() {
      return this._owner;
    }
    set owner(value) {
      this._owner = value;
      if (!value)
        this.onDestroy();
    }
    getColor() {
      return 16777215;
    }
    setColor(value) {
    }
    refresh(bySizeChanged) {
      if (!this._owner)
        return;
      let zeroSize = this._owner.width <= 0 || this._owner.height <= 0;
      if (bySizeChanged && !this.sizeSensitive && zeroSize == this.empty)
        return;
      Timers.callLater(this._draw, this);
    }
    refreshNow() {
      if (this._owner)
        this._draw();
    }
    _draw() {
      if (!this._owner || !this._owner.clearBackgroundStyle)
        return;
      this._owner.clearBackgroundStyle();
      if (this._owner.width > 0 && this._owner.height > 0) {
        this.onRender(this._owner.style);
        this.empty = false;
      } else
        this.empty = true;
    }
    adjustContentBox(offsetX, offsetY) {
      if (offsetX != 0 || offsetY != 0) {
        this._owner.classList.add("offsetChildren");
        this._owner.style.setProperty("--offset-children-x", offsetX + "px");
        this._owner.style.setProperty("--offset-children-y", offsetY + "px");
      }
    }
    onRender(style) {
    }
    onDestroy() {
    }
  };

  // src/display/SRect.ts
  var SRect = class extends SGraphics {
    constructor(lineWidth, lineColor, fillColor) {
      super();
      this._lineStyle = "solid";
      this._lineWidth = lineWidth ?? 1;
      this._lineColor = lineColor ?? new Color().copy(Color.BLACK);
      this._fillColor = fillColor ?? new Color().copy(Color.WHITE);
    }
    get lineWidth() {
      return this._lineWidth;
    }
    set lineWidth(value) {
      this._lineWidth = value;
      this.refresh();
    }
    get lineColor() {
      return this._lineColor;
    }
    set lineColor(value) {
      this._lineColor = value;
      this.refresh();
    }
    get fillColor() {
      return this._fillColor;
    }
    set fillColor(value) {
      this._fillColor = value;
      this.refresh();
    }
    get lineStyle() {
      return this._lineStyle;
    }
    set lineStyle(value) {
      this._lineStyle = value;
      this.refresh();
    }
    /**
    * [TL，TR，BR，BL]
    */
    get borderRadius() {
      return this._radius;
    }
    set borderRadius(value) {
      this._radius = value;
      this.refresh();
    }
    get radiusIsRatio() {
      return this._ratio;
    }
    set radiusIsRatio(value) {
      this._ratio = value;
      this.refresh();
    }
    get color() {
      return this._fillColor.getHex();
    }
    set color(value) {
      this._fillColor.parse(value);
      this.refresh();
    }
    getColor() {
      return this.color;
    }
    setColor(value) {
      this.color = value;
    }
    onRender(style) {
      if (this._fillColor.a != 0)
        style.backgroundColor = this._fillColor.getStyleString();
      else
        style.backgroundColor = "transparent";
      style.border = `${this._lineWidth}px ${this._lineStyle} ${this._lineColor.getStyleString()}`;
      this.adjustContentBox(-this._lineWidth, -this._lineWidth);
      if (!this._radius || this._radius.every((r2) => r2 == 0))
        style.borderRadius = "";
      else {
        let str = "";
        if (this._ratio) {
          for (let e of this._radius)
            str += clamp01(e) * 100 + "% ";
        } else {
          for (let e of this._radius)
            str += e + "px ";
        }
        style.borderRadius = str;
      }
    }
  };

  // src/ui/Shape.ts
  var Shape = class extends Widget {
    get graphics() {
      return this._graphics;
    }
    set graphics(value) {
      this._setGraphics(value);
    }
    get color() {
      return this._graphics.getColor();
    }
    set color(value) {
      if (this._graphics)
        this._graphics.setColor(value);
    }
    getGraphics(classType) {
      if (!(this._graphics instanceof classType))
        this.graphics = new classType();
      return this._graphics;
    }
    drawRect(lineWidth, lineColor, fillColor, topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius) {
      let ss = new SRect();
      ss.lineWidth = lineWidth;
      ss.lineColor = lineColor;
      ss.fillColor = fillColor;
      if (topLeftRadius != null) {
        ss.borderRadius = [
          topLeftRadius,
          topRightRadius ?? topLeftRadius,
          bottomRightRadius ?? topLeftRadius,
          bottomLeftRadius ?? topLeftRadius
        ];
      }
      this.graphics = ss;
      return ss;
    }
  };

  // src/ui/Window.ts
  var Window = class extends Widget {
    constructor() {
      super();
      this._requestingCmd = 0;
      this.bringToFontOnClick = UIConfig.bringWindowToFrontOnClick;
      this.on("added_to_stage", this._onShown, this);
      this.on("removed_from_stage", this._onHidden, this);
      this.on("pointer_down", this._winTouchBegin, this);
    }
    set contentPane(val) {
      if (this._contentPane != val) {
        if (this._contentPane)
          this.removeChild(this._contentPane);
        this._contentPane = val;
        if (this._contentPane) {
          this.addChild(this._contentPane);
          this.setSize(this._contentPane.width, this._contentPane.height);
          this._contentPane.addRelation(this, 100 /* Size */);
          this._frame = this._contentPane.getChild("frame");
          if (this._frame) {
            this.closeButton = this._frame.getChild("closeButton");
            this.dragArea = this._frame.getChild("dragArea");
            this.contentArea = this._frame.getChild("contentArea");
          }
        }
      }
    }
    get contentPane() {
      return this._contentPane;
    }
    get frame() {
      return this._frame;
    }
    get closeButton() {
      return this._closeButton;
    }
    set closeButton(value) {
      if (this._closeButton)
        this._closeButton.offClick(this.closeEventHandler, this);
      this._closeButton = value;
      if (this._closeButton)
        this._closeButton.onClick(this.closeEventHandler, this);
    }
    get dragArea() {
      return this._dragArea;
    }
    set dragArea(value) {
      if (this._dragArea != value) {
        if (this._dragArea) {
          this._dragArea.draggable = false;
          this._dragArea.off("drag_start", this._dragStart, this);
        }
        this._dragArea = value;
        if (this._dragArea) {
          if (this._dragArea instanceof Shape)
            this._dragArea.drawRect(0, Color.CLEAR, Color.CLEAR);
          this._dragArea.draggable = true;
          this._dragArea.on("drag_start", this._dragStart, this);
        }
      }
    }
    get contentArea() {
      return this._contentArea;
    }
    set contentArea(value) {
      this._contentArea = value;
    }
    show(groot) {
      (groot ?? this.findRoot()).showWindow(this);
    }
    hide() {
      if (this.isShowing)
        this.doHideAnimation();
    }
    hideImmediately() {
      this.findRoot().hideWindowImmediately(this);
    }
    toggleStatus() {
      if (this.isTop)
        this.hide();
      else
        this.show();
    }
    get isShowing() {
      return this.parent != null;
    }
    get isTop() {
      return this.parent && this.parent.getChildIndex(this) == this.parent.numChildren - 1;
    }
    get modal() {
      return this._modal;
    }
    set modal(val) {
      this._modal = val;
    }
    bringToFront() {
      this.findRoot().bringToFront(this);
    }
    showModalWait(requestingCmd) {
      if (requestingCmd != null)
        this._requestingCmd = requestingCmd;
      if (UIConfig.windowModalWaiting) {
        if (!this._modalWaitPane)
          this._modalWaitPane = UIConfig.windowModalWaiting.create();
        this.layoutModalWaitPane();
        this.addChild(this._modalWaitPane);
      }
    }
    layoutModalWaitPane() {
      if (this._contentArea) {
        let pt = this._frame.localToGlobal();
        pt = this.globalToLocal(pt.x, pt.y, pt);
        this._modalWaitPane.setPos(pt.x + this._contentArea.x, pt.y + this._contentArea.y);
        this._modalWaitPane.setSize(this._contentArea.width, this._contentArea.height);
      } else
        this._modalWaitPane.setSize(this.width, this.height);
    }
    closeModalWait(requestingCmd) {
      if (requestingCmd != null) {
        if (this._requestingCmd != requestingCmd)
          return false;
      }
      this._requestingCmd = 0;
      if (this.modalWaiting)
        this.removeChild(this._modalWaitPane);
      return true;
    }
    get modalWaiting() {
      return this._modalWaitPane != null && this._modalWaitPane.parent != null;
    }
    async onInit() {
    }
    onShown() {
    }
    onHide() {
    }
    doShowAnimation() {
      this.onShown();
    }
    doHideAnimation() {
      this.hideImmediately();
    }
    destroy() {
      if (this.parent)
        this.hideImmediately();
      super.destroy();
    }
    closeEventHandler() {
      this.hide();
    }
    _onShown() {
      if (!this._inited) {
        if (!this._loading) {
          this._loading = true;
          this.onInit().then(() => {
            this._loading = false;
            this._inited = true;
            if (this.isShowing)
              this.doShowAnimation();
          });
        }
      } else
        this.doShowAnimation();
    }
    _onHidden() {
      this.closeModalWait();
      this.onHide();
    }
    _winTouchBegin() {
      if (this.isShowing && this.bringToFontOnClick)
        this.bringToFront();
    }
    _dragStart(evt) {
      evt.preventDefault();
      this.startDrag(evt.input.pointerId);
    }
  };

  // src/ui/WidgetRef.ts
  var WidgetRef = class _WidgetRef {
    static create(oldVal, target, callback) {
      if (oldVal)
        oldVal.destroy();
      if (target)
        return new _WidgetRef(target, callback);
      else
        return null;
    }
    constructor(val, callback) {
      this.p = val;
      if (!UIPackage.isPlaying) {
        val.on("instance_reload", this._reload, this);
        this._callback = callback;
      }
    }
    destroy() {
      if (!UIPackage.isPlaying)
        this.p.off("instance_reload", this._reload, this);
    }
    _reload(evt) {
      this.p = evt.data;
      this._callback();
    }
  };

  // src/ui/WidgetPool.ts
  var WidgetPool = class {
    constructor() {
      this._count = 0;
      this._items = {};
    }
    clear() {
      for (let i in this._items) {
        let arr = this._items[i];
        arr.forEach((obj) => obj.destroy());
      }
      this._items = {};
      this._count = 0;
    }
    get count() {
      return this._count;
    }
    get defaultRes() {
      return this._defaultRes;
    }
    set defaultRes(value) {
      this._defaultRes = value;
      if (value && !value.url)
        value.url = "data:" + idCounter2++;
    }
    get defaultRuntime() {
      return this._defaultRuntime;
    }
    set defaultRuntime(value) {
      this._defaultRuntime = value;
      if (value)
        this._createOptions = { runtime: value };
      else
        this._createOptions = null;
    }
    getObject(url) {
      if (!url) {
        url = this._defaultRes?.url;
        if (!url) {
          console.warn("set defaultRes first!");
          return null;
        }
      }
      let arr = this._items[url];
      if (arr && arr.length > 0) {
        this._count--;
        return arr.shift();
      }
      let ret;
      if (url.startsWith("data:"))
        ret = this._defaultRes.create(this._createOptions);
      else
        ret = UIPackage.createWidgetSync(url, this._createOptions);
      if (ret)
        ret.hideFlags |= HideFlags.HideAndDontSave;
      return ret;
    }
    returnObject(obj) {
      let url = obj.prefabUrl;
      if (!url) {
        obj.destroy();
        return;
      }
      let arr = this._items[url];
      if (!arr) {
        arr = [];
        this._items[url] = arr;
      }
      this._count++;
      arr.push(obj);
    }
  };
  var idCounter2 = 0;

  // src/ui/TextStyle.ts
  var TextStyle = class {
    constructor() {
      this.font = "";
      this.fontSize = 16;
      this.color = 16777215;
      this.leading = 0;
      this.align = 0;
      this.valign = 0;
      this.stroke = 0;
      this.strokeColor = 0;
    }
    get alignStr() {
      return AlignNames[this.align];
    }
    get valignStr() {
      return VAlignNames[this.valign];
    }
  };
  var AlignNames = ["left", "center", "right"];
  var VAlignNames = ["top", "middle", "bottom"];

  // src/core/Translations.ts
  var _tmpInfo = { text: "" };
  var _Translations = class _Translations extends Resource {
    static getById(id) {
      return _Translations._allInsts.get(id) || null;
    }
    static create(id, fallbackLng) {
      return new _Translations(id, fallbackLng);
    }
    static translate(text, options) {
      this.decodeI18nText(text, _tmpInfo);
      let i18n;
      if (_tmpInfo.sid)
        i18n = _Translations.getById(_tmpInfo.sid);
      else if (_tmpInfo.key)
        i18n = UIPackage.i18nProvider;
      if (i18n)
        text = i18n.t(_tmpInfo.key, _tmpInfo.text ?? void 0, options ?? void 0);
      return text;
    }
    static decodeI18nText(text, out) {
      out = out || {};
      if (!text || !text.startsWith("i18n:")) {
        out.sid = null;
        out.key = null;
        out.text = text;
        return out;
      }
      let i = text.indexOf(":", 5);
      let j = text.indexOf("|", 5);
      if (i != -1) {
        out.sid = text.substring(5, i);
        if (j != -1) {
          out.key = text.substring(i + 1, j);
          out.text = text.substring(j + 1);
        } else {
          out.key = text.substring(i + 1);
          out.text = null;
        }
      } else if (j != -1) {
        out.sid = null;
        out.key = text.substring(5, j);
        out.text = text.substring(j + 1);
      } else {
        out.sid = null;
        out.key = text.substring(5);
        out.text = null;
      }
      return out;
    }
    static encodeI18nText(info, newText) {
      if (newText == null)
        newText = info.text ?? "";
      if (!info.key)
        return newText;
      if (info.sid)
        return "i18n:" + info.sid + ":" + info.key + "|" + newText;
      else
        return "i18n:" + info.key + "|" + newText;
    }
    constructor(id, fallbackLng) {
      super();
      this._id = id;
      _Translations._allInsts.set(id, this);
      this._lngs = [];
      this._fallbackLng = fallbackLng || "en";
    }
    get id() {
      return this._id;
    }
    setContent(lng, content) {
      let i18n = UIPackage.i18nProvider;
      if (!i18n || !i18n.isInitialized) {
        console.error("no i18n provider or i18 is not initialized");
        return this;
      }
      if (!lng)
        lng = UIPackage.language;
      UIPackage.i18nProvider.addResourceBundle(lng, this._id, content, true, true);
      if (this._lngs.indexOf(lng) == -1)
        this._lngs.push(lng);
      if (lng == UIPackage.language)
        this._t = i18n.getFixedT(UIPackage.language, this._id);
      else if (!this._t && lng == this._fallbackLng)
        this._t = i18n.getFixedT(this._fallbackLng, this._id);
      return this;
    }
    t(name, arg0, arg1) {
      if (this._t)
        return this._t(name, arg0, arg1);
      else if (typeof arg0 === "string")
        return arg0;
      else
        return name;
    }
    onDestroy() {
      super.onDestroy();
      _Translations._allInsts.delete(this._id);
      for (let lng of this._lngs)
        UIPackage.i18nProvider.removeResourceBundle(lng, this._id);
    }
  };
  _Translations._allInsts = /* @__PURE__ */ new Map();
  var Translations = _Translations;

  // src/ui/TextField.ts
  var TextField = class extends Widget {
    constructor() {
      super();
      this._text = "";
      this._autoSize = 0;
      this._wrap = false;
      this._html = false;
      this._maxWrapWidth = 0;
      this._textWidth = 0;
      this._textHeight = 0;
      this._ubb = false;
      this._updatingSize = false;
      this._wrapChanged = true;
      let tf = new TextStyle();
      this._style = hookSetterAsync(tf, this.applyStyle, this);
    }
    createElement() {
      super.createElement();
      this._span = document.createElement("span");
      this._span.className = "ui-text";
      this._span.style.overflow = "hidden";
      this._element.appendChild(this._span);
    }
    get text() {
      return this._text;
    }
    set text(value) {
      if (value == null)
        value = "";
      if (this._text.length < 20 && this._text == value)
        return;
      this._text = value;
      this.markChanged();
      if (!SerializeUtil.isDeserializing)
        Timers.runCallLater(this.typeset, this);
    }
    get title() {
      return this.text;
    }
    set title(value) {
      this.text = value;
    }
    get templateVars() {
      return this._templateVars;
    }
    set templateVars(value) {
      if (!this._templateVars && !value)
        return;
      if (value === true)
        this._templateVars = {};
      else if (value === false)
        this._templateVars = null;
      else
        this._templateVars = value;
      this.markChanged();
    }
    setVar(name, value) {
      if (!this._templateVars)
        this._templateVars = {};
      this._templateVars[name] = value;
      this.markChanged();
      return this;
    }
    get style() {
      return this._style;
    }
    set html(value) {
      if (this._html != value) {
        this._html = value;
        this.markChanged();
      }
    }
    get html() {
      return this._html;
    }
    set ubb(value) {
      if (this._ubb != value) {
        this._ubb = value;
        this.markChanged();
      }
    }
    get ubb() {
      return this._ubb;
    }
    get color() {
      return this._style.color;
    }
    set color(value) {
      if (this._style.color != value) {
        this._style.color = value;
        Timers.callLater(this.applyStyle, this);
      }
    }
    get autoSize() {
      return this._autoSize;
    }
    set autoSize(value) {
      if (this._autoSize != value) {
        this._autoSize = value;
        this._wrapChanged = true;
        this.markChanged();
        if (this._autoSize == 1 /* Both */) {
          this._span.style.width = "";
          this._span.style.overflow = "";
        } else if (this._autoSize == 2 /* Height */) {
          this._span.style.overflow = "";
        } else
          this._span.style.overflow = "hidden";
        if (this._autoSize == 4 /* Ellipsis */)
          this._span.style.textOverflow = "ellipsis";
        else
          this._span.style.textOverflow = "";
      }
    }
    get wrap() {
      return this._wrap;
    }
    set wrap(value) {
      if (this._wrap != value) {
        this._wrap = value;
        this._wrapChanged = true;
        this.markChanged();
      }
    }
    get maxWrapWidth() {
      return this._maxWrapWidth;
    }
    set maxWrapWidth(value) {
      if (this._maxWrapWidth != value) {
        this._maxWrapWidth = value;
        this._wrapChanged = true;
        this.markChanged();
      }
    }
    get selectable() {
      return this._selectable;
    }
    set selectable(value) {
      if (this._selectable != value) {
        this._selectable = value;
        if (!this._getBit(NodeFlags.EDITING_NODE)) {
          if (value)
            this._span.classList.add("selectable");
          else
            this._span.classList.remove("selectable");
        }
      }
    }
    setLinkStyle(underline) {
      if (underline)
        this._span.classList.remove("ui-link-no_underline");
      else
        this._span.classList.add("ui-link-no_underline");
    }
    get textWidth() {
      return this._textWidth;
    }
    get textHeight() {
      return this._textHeight;
    }
    markChanged() {
      if (!this._changed) {
        this._changed = true;
        Timers.callLater(this.typeset, this);
      }
    }
    applyStyle() {
      let changed = false;
      let style = this._style;
      let css = this._span.style;
      let fontSize = style.fontSize + "px";
      let lineHeight = style.fontSize + style.leading + "px";
      if (fontSize != css.fontSize) {
        css.fontSize = fontSize;
        changed = true;
      }
      if (css.fontFamily != style.font) {
        css.fontFamily = style.font;
        changed = true;
      }
      if (css.lineHeight != lineHeight) {
        css.lineHeight = lineHeight;
        changed = true;
      }
      css.color = Color.hexToString(style.color);
      css.fontWeight = style.bold ? "bold" : "";
      css.fontStyle = style.italic ? "italic" : "";
      let str = style.underline ? "underline" : "";
      if (style.strikethrough) {
        if (str.length > 0)
          str += " ";
        str += "line-through";
      }
      css.textDecoration = str;
      if (style.stroke > 0)
        css.webkitTextStroke = style.stroke + "px " + Color.hexToString(style.strokeColor);
      else if (css.webkitTextStroke)
        css.webkitTextStroke = "unset";
      if (css.textAlign != style.alignStr) {
        css.textAlign = style.alignStr;
        changed = true;
      }
      if (style.valign == 0)
        css.top = "0px";
      else if (style.valign == 1)
        css.top = Math.max(0, Math.ceil((this.height - this._textHeight) * 0.5)) + "px";
      else
        css.top = Math.max(0, this.height - this._textHeight) + "px";
      if (changed && !this._updatingSize)
        this.markChanged();
    }
    async typeset() {
      this._changed = false;
      let text = this._text;
      text = Translations.translate(text, this._templateVars);
      if (this._templateVars)
        text = this.parseTemplate(text);
      if (!this._html)
        text = XMLUtils.encodeString(text);
      if (this._ubb)
        text = UBBParser.inst.parse(text);
      this._parsedText = text;
      this.renderText();
    }
    renderText() {
      this._updatingSize = true;
      let css = this._span.style;
      if (!css.color)
        this.applyStyle();
      let text = this._parsedText;
      if (this._autoSize == 1 /* Both */)
        css.width = "";
      else
        css.width = this.width + "px";
      if (this._wrapChanged) {
        this._wrapChanged = false;
        if (this._autoSize == 1 /* Both */ || !this._wrap) {
          css.whiteSpace = "pre";
          css.wordBreak = "normal";
        } else {
          css.whiteSpace = "pre-wrap";
          css.wordBreak = "break-word";
        }
      }
      this._span.innerHTML = text;
      let usingHelper;
      if (!this._element.isConnected || text.length > 0 && this._span.clientWidth == 0) {
        usingHelper = true;
        if (!textMeasureHelper.parentElement)
          document.body.appendChild(textMeasureHelper);
        textMeasureHelper.appendChild(this._span);
      }
      if (this._maxWrapWidth > 0 && this._span.clientWidth > this._maxWrapWidth) {
        css.width = this._maxWrapWidth + "px";
        css.whiteSpace = "pre-wrap";
        css.wordBreak = "break-word";
        this._wrapChanged = true;
      }
      this._textWidth = this._span.clientWidth;
      this._textHeight = this._span.clientHeight;
      if (this._textHeight == 4)
        this._textHeight = 0;
      if (!this._getBit(NodeFlags.EDITING_NODE) || this._textWidth > 0 && this._textHeight > 0) {
        if (this._autoSize == 1 /* Both */)
          this.setSize(this._textWidth, this._textHeight);
        else if (this._autoSize == 2 /* Height */)
          this.height = this._textHeight;
      }
      if (usingHelper)
        this._element.appendChild(this._span);
      css.width = this.width + "px";
      if (this._style.valign == 0)
        css.top = "0px";
      else if (this._style.valign == 1)
        css.top = Math.max(0, Math.ceil((this.height - this._textHeight) * 0.5)) + "px";
      else
        css.top = Math.max(0, this.height - this._textHeight) + "px";
      this._updatingSize = false;
    }
    _sizeChanged(changeByLayout) {
      super._sizeChanged();
      if (!this._updatingSize) {
        if (changeByLayout)
          Timers.runCallLater(this.typeset, this);
        else
          this.markChanged();
      }
    }
    parseTemplate(template) {
      let pos1 = 0, pos2, pos3;
      let tag;
      let value;
      let result = "";
      let len = template.length;
      let vars = this._templateVars;
      while ((pos2 = template.indexOf("{", pos1)) != -1) {
        if (pos2 > 0 && template.charCodeAt(pos2 - 1) == 92) {
          result += template.substring(pos1, pos2 - 1);
          result += "{";
          pos1 = pos2 + 1;
          continue;
        }
        let doubleBrace = pos2 < len - 1 && template.charCodeAt(pos2 + 1) == 123;
        result += template.substring(pos1, pos2);
        pos1 = pos2;
        pos2 = template.indexOf("}", pos1);
        if (pos2 == -1)
          break;
        if (doubleBrace) {
          if (pos2 < len - 1 && template.charCodeAt(pos2 + 1) == 125) {
            tag = template.substring(pos1 + 2, pos2);
            pos1 = pos2 + 2;
          } else
            break;
        } else {
          tag = template.substring(pos1 + 1, pos2);
          pos1 = pos2 + 1;
        }
        pos3 = tag.indexOf("=");
        if (pos3 != -1) {
          value = vars[tag.substring(0, pos3)];
          if (value == null)
            result += tag.substring(pos3 + 1);
          else
            result += value;
        } else {
          value = vars[tag];
          if (value != null)
            result += value;
        }
      }
      if (pos1 < len)
        result += template.substring(pos1);
      return result;
    }
  };
  var textMeasureHelper = document.createElement("div");
  textMeasureHelper.id = "ui-text-helper";
  textMeasureHelper.style.position = "absolute";
  textMeasureHelper.style.left = "-10000px";
  textMeasureHelper.style.top = "-10000px";
  textMeasureHelper.style.pointerEvents = "none";
  textMeasureHelper.style.width = "10000px";

  // src/ui/TextInput.ts
  var _TextInput = class _TextInput extends Widget {
    constructor(multiline) {
      super();
      this._text = "";
      this._maxLength = 0;
      this._maxHeight = 0;
      this._minHeight = 0;
      this._multiline = !!multiline;
      this.cursor = "auto";
      this._padding = [0, 0, 0, 0];
      let tf = new TextStyle();
      this._style = hookSetterAsync(tf, this.applyStyle, this);
      this._element.addEventListener("dragstart", (evt) => {
        if (_TextInput.isAnyEditing) {
          evt.stopPropagation();
          evt.preventDefault();
        }
      });
      this.on("focus_in", () => {
        _TextInput.activeInst = this;
        this._focusEventFlag = true;
        this._input.focus();
        this._focusEventFlag = false;
      });
      this.on("focus_out", () => {
        if (this._input.readOnly)
          this._input.setSelectionRange(0, 0);
        else {
          this._focusEventFlag = true;
          this._input.blur();
          this._focusEventFlag = false;
        }
      });
      this.createInputElement();
    }
    static get isAnyEditing() {
      return _TextInput.activeInst != null;
    }
    get text() {
      return this._text;
    }
    set text(value) {
      if (value == null)
        value = "";
      this._text = value;
      this._input.value = Translations.translate(this._text);
      if (this._autoHeight && this._multiline)
        this.adjustHeight();
    }
    get title() {
      return this.text;
    }
    set title(value) {
      this.text = value;
    }
    get style() {
      return this._style;
    }
    get multiline() {
      return this._multiline;
    }
    set multiline(value) {
      if (this._multiline != value) {
        this._multiline = value;
        this.createInputElement();
      }
    }
    get password() {
      return this._password;
    }
    set password(value) {
      if (this._password != value) {
        this._password = value;
        if (this._input instanceof HTMLInputElement)
          this._input.type = value ? "password" : "text";
      }
    }
    set editable(value) {
      this._input.readOnly = !value;
    }
    get editable() {
      return !this._input.readOnly;
    }
    get maxLength() {
      return this._maxLength;
    }
    set maxLength(value) {
      this._maxLength = value;
      this._input.maxLength = value > 0 ? value : 524288;
    }
    get prompt() {
      return this._prompt;
    }
    set prompt(value) {
      this._prompt = value;
      this._input.placeholder = UBBParser.inst.parse(Translations.translate(value), true);
    }
    get padding() {
      return this._padding;
    }
    set padding(value) {
      if (value == null || !Array.isArray(value))
        value = [0, 0, 0, 0];
      this._padding = value;
      let str = "";
      for (let i = 0; i < 4; i++)
        str += value[i] + defaultInputPadding[i] + "px ";
      this._input.style.padding = str;
    }
    get autoHeight() {
      return this._autoHeight;
    }
    set autoHeight(value) {
      this._autoHeight = value;
      if (this._multiline)
        this.applyAutoHeight();
    }
    get maxHeight() {
      return this._maxHeight;
    }
    set maxHeight(value) {
      this._maxHeight = value;
      if (this._multiline)
        this.applyAutoHeight();
    }
    get background() {
      return this._graphics;
    }
    set background(value) {
      this._setGraphics(value);
    }
    setSelection(start, end) {
      this._input.setSelectionRange(start, end);
    }
    createInputElement() {
      let old = this._input;
      if (old)
        this._element.removeChild(old);
      let input;
      if (this._multiline)
        input = document.createElement("textarea");
      else
        input = document.createElement("input");
      this._input = input;
      input.classList.add("ui-input");
      input.value = Translations.translate(this._text);
      input.spellcheck = false;
      if (old) {
        input.readOnly = old.readOnly;
        input.placeholder = old.placeholder;
        input.maxLength = old.maxLength > 0 ? old.maxLength : 524288;
        input.disabled = old.disabled;
        input.style.pointerEvents = old.style.pointerEvents;
      }
      input.style.width = "100%";
      input.style.height = "100%";
      input.addEventListener("focus", () => {
        _TextInput.activeInst = this;
        if (!this._focusEventFlag)
          this.findRoot().inputMgr.setFocus(this);
      });
      input.addEventListener("blur", () => {
        _TextInput.activeInst = null;
        if (!this._focusEventFlag) {
          let mgr = this.findRoot().inputMgr;
          if (mgr.focus == this)
            mgr.setFocus(null);
        }
      });
      this._element.appendChild(this._input);
      this.applyStyle();
      if (input instanceof HTMLInputElement) {
        if (this._password)
          input.type = "password";
        else
          input.type = "text";
        input.addEventListener("keydown", (evt) => {
          if (evt.key == "Enter" && !evt.ctrlKey && !evt.altKey && !evt.metaKey) {
            this._text = input.value;
            this.emit("submit");
          }
        });
        input.addEventListener("input", (evt) => {
          this._text = input.value;
          if (!evt.isComposing)
            this.emit("changed");
        });
        input.addEventListener("compositionend", () => {
          this._text = input.value;
          this.emit("changed");
        });
      } else {
        this.applyAutoHeight();
        input.addEventListener("input", (evt) => {
          this._text = input.value;
          if (this._autoHeight)
            this.adjustHeight();
          if (!evt.isComposing)
            this.emit("changed");
        });
        input.addEventListener("compositionend", () => {
          this._text = input.value;
          if (this._autoHeight)
            this.adjustHeight();
          this.emit("changed");
        });
      }
      this.emit("input-created");
    }
    adjustHeight() {
      let h;
      if (this._text.length == 0)
        h = this._minHeight;
      else {
        this._input.style.height = "auto";
        h = this._input.scrollHeight;
        if (this._maxHeight > 0)
          h = Math.min(this._maxHeight, h);
        if (h < this._minHeight)
          h = this._minHeight;
      }
      this._updatingSize = true;
      this.height = h;
      this._input.style.height = "100%";
      this._updatingSize = false;
    }
    applyAutoHeight() {
      this._input.rows = this._autoHeight ? 1 : 2;
      if (this._autoHeight && this._maxHeight > 0)
        this._input.style.maxHeight = this._maxHeight - this.padding[0] - defaultInputPadding[0] - this.padding[2] - defaultInputPadding[2] + "px";
      else
        this._input.style.maxHeight = "";
      if (this._autoHeight)
        this.adjustHeight();
    }
    applyStyle() {
      let css = this._input.style;
      css.textAlign = this._style.alignStr;
      css.fontSize = this._style.fontSize + "px";
      css.fontFamily = this._style.font;
      css.color = Color.hexToString(this._style.color);
    }
    _processTouchable() {
      super._processTouchable();
      if (!this.touchable)
        this._input.setSelectionRange(0, 0);
    }
    _sizeChanged(changeByLayout) {
      super._sizeChanged(changeByLayout);
      if (!this._updatingSize && this._deltaHeight != 0)
        this._minHeight = this.height;
    }
  };
  _TextInput.activeInst = null;
  var TextInput = _TextInput;

  // src/ui/Label.ts
  var Label = class _Label extends Widget {
    get title() {
      if (this._titleWidget)
        return this._titleWidget.p.text;
      else
        return "";
    }
    set title(value) {
      if (this._titleWidget)
        this._titleWidget.p.text = value;
    }
    get text() {
      return this.title;
    }
    set text(value) {
      this.title = value;
    }
    get icon() {
      if (this._iconWidget)
        return this._iconWidget.p.icon;
      else
        return "";
    }
    set icon(value) {
      if (this._iconWidget)
        this._iconWidget.p.icon = value;
    }
    get titleColor() {
      let tf = this.findTextWidget();
      if (tf)
        return tf.style.color;
      else
        return 0;
    }
    set titleColor(value) {
      let tf = this.findTextWidget();
      if (tf)
        tf.style.color = value;
    }
    get titleFontSize() {
      let tf = this.findTextWidget();
      if (tf)
        return tf.style.fontSize;
      else
        return 0;
    }
    set titleFontSize(value) {
      let tf = this.findTextWidget();
      if (tf)
        tf.style.fontSize = value;
    }
    get titleWidget() {
      return this._titleWidget?.p || null;
    }
    set titleWidget(val) {
      this._titleWidget = WidgetRef.create(this._titleWidget, val, () => this._onPartChanged("title"));
      this._onPartChanged("title");
    }
    get iconWidget() {
      return this._iconWidget?.p || null;
    }
    set iconWidget(val) {
      this._iconWidget = WidgetRef.create(this._iconWidget, val, () => this._onPartChanged("icon"));
      this._onPartChanged("icon");
    }
    _onPartChanged(which) {
    }
    findTextWidget() {
      let p = this._titleWidget;
      while (p) {
        let pp = p.p;
        if (pp instanceof TextField || pp instanceof TextInput)
          return pp;
        if (pp instanceof _Label)
          p = pp._titleWidget;
        else
          break;
      }
      return null;
    }
    get background() {
      return this._graphics;
    }
    set background(value) {
      this._setGraphics(value);
    }
  };

  // src/display/SImage.ts
  var SImage = class extends SGraphics {
    constructor(src) {
      super();
      this._color = 16777215;
      this.texture = src;
    }
    get texture() {
      return this._tex;
    }
    set texture(value) {
      if (this._tex == value)
        return;
      if (this._tex) {
        this._tex.removeRef();
        if (!UIPackage.isPlaying)
          this._tex.off("instance_reload", this.onTextureReload, this);
      }
      this._tex = value;
      if (value) {
        value.addRef();
        if (!UIPackage.isPlaying)
          this._tex.on("instance_reload", this.onTextureReload, this);
      }
      this.refreshNow();
    }
    onTextureReload() {
      this._owner.owner?.emit("resource_reload", this);
      this.refresh();
    }
    get tile() {
      return this._tile;
    }
    set tile(value) {
      if (this._tile != value) {
        this._tile = value;
        this.refresh();
      }
    }
    get borderRadius() {
      return this._radius;
    }
    set borderRadius(value) {
      this._radius = value;
      this.refresh();
    }
    get radiusIsRatio() {
      return this._ratio;
    }
    set radiusIsRatio(value) {
      this._ratio = value;
      this.refresh();
    }
    get color() {
      return this._color;
    }
    set color(value) {
      if (this._color != value) {
        this._color = value;
        this.refresh();
      }
    }
    getColor() {
      return this.color;
    }
    setColor(value) {
      this.color = value;
    }
    onDestroy() {
      this.texture = null;
    }
    onRender(style) {
      let src = this._tex;
      if (!src)
        return;
      if (this._tile) {
        style.backgroundImage = "url('" + src.formattedUrl + "')";
        style.backgroundSize = "auto";
        style.backgroundRepeat = "repeat";
      } else if (src.sizeGrid) {
        style.backgroundImage = "none";
        style.borderImage = "url('" + src.formattedUrl + "')";
        style.borderImageWidth = "auto";
        style.borderImageSlice = this._tex.sizeGrid[0] + " " + src.sizeGrid[1] + " " + src.sizeGrid[2] + " " + src.sizeGrid[3] + " fill";
        if (src.sizeGrid[4] == 1)
          style.borderImageRepeat = "repeat";
        else
          style.borderImageRepeat = "";
      } else {
        style.backgroundImage = "url('" + src.formattedUrl + "')";
        style.backgroundSize = "100% 100%";
        style.backgroundRepeat = "no-repeat";
      }
      if (!this._radius)
        style.borderRadius = "";
      else {
        let str = "";
        if (this._ratio) {
          for (let e of this._radius)
            str += clamp01(e) * 100 + "% ";
        } else {
          for (let e of this._radius)
            str += e + "px ";
        }
        style.borderRadius = str;
      }
      if (this._color != 16777215) {
        let mr = ((this._color & 16711680) >> 16) / 255;
        let mg = ((this._color & 65280) >> 8) / 255;
        let mb = (this._color & 255) / 255;
        let filter = ` url('data:image/svg+xml,            <svg xmlns="http://www.w3.org/2000/svg">              <filter id="color">              <feColorMatrix type="matrix" values="                ` + mr + " 0 0 0 0                0 " + mg + " 0 0 0                0 0 " + mb + ` 0 0                 0 0 0 1 0" />              </filter>            </svg>#color')`;
        style.filter = filter + " " + style.filter;
      }
    }
  };

  // src/ui/Image.ts
  var Image2 = class extends Widget {
    constructor() {
      super();
      this._src = "";
      this._loadId = 0;
      this._autoSize = true;
      this._graphics = new SImage();
      this._setGraphics(this._graphics);
      if (!UIPackage.isPlaying)
        this.on("resource_reload", this.onReload, this);
    }
    get src() {
      return this._src;
    }
    set src(value) {
      if (value == null)
        value = "";
      if (this._src == value)
        return;
      this._src = value;
      let loadID = ++this._loadId;
      if (value)
        UIPackage.resourceMgr.load(value, "image").then((res) => this.onLoaded(res, loadID));
      else
        this.onLoaded(null, loadID);
    }
    get texture() {
      return this._graphics.texture;
    }
    set texture(value) {
      this._src = "instance-0";
      this.onLoaded(value, ++this._loadId);
    }
    get borderRadius() {
      return this._graphics.borderRadius;
    }
    set borderRadius(value) {
      this._graphics.borderRadius = value;
    }
    get radiusIsRatio() {
      return this._graphics.radiusIsRatio;
    }
    set radiusIsRatio(value) {
      this._graphics.radiusIsRatio = value;
    }
    get icon() {
      return this.src;
    }
    set icon(value) {
      this.src = value;
    }
    get autoSize() {
      return this._autoSize;
    }
    set autoSize(value) {
      if (this._autoSize != value) {
        if (value && this._graphics.texture)
          this.setSize(this._graphics.texture.width, this._graphics.texture.height);
        this._autoSize = value;
      }
    }
    get tile() {
      return this._graphics.tile;
    }
    set tile(value) {
      this._graphics.tile = value;
    }
    get color() {
      return this._graphics.color;
    }
    set color(value) {
      this._graphics.color = value;
    }
    onLoaded(res, loadID) {
      if (this._loadId != loadID || this.destroyed)
        return;
      this._graphics.texture = res;
      if (this._autoSize) {
        if (res)
          this.setSize(res.width, res.height);
        else if (!this._getBit(NodeFlags.EDITING_NODE))
          this.setSize(0, 0);
        this._autoSize = true;
      }
      this.emit("loaded");
    }
    _sizeChanged(changeByLayout) {
      super._sizeChanged();
      if (!changeByLayout && !SerializeUtil.isDeserializing)
        this._autoSize = false;
    }
    onReload() {
      if (this._autoSize) {
        let tex = this._graphics.texture;
        this.setSize(tex.width, tex.height);
        this._autoSize = true;
      }
    }
  };

  // src/ui/Button.ts
  var ButtonPageAlternatives = {
    [2 /* Over */]: 0 /* Up */,
    [3 /* SelectedOver */]: 1 /* Down */,
    [4 /* Disabled */]: 0 /* Up */,
    [5 /* SelectedDisabled */]: 1 /* Down */
  };
  var SaveColorSymbol = Symbol();
  var tmpColor2;
  var downEffectValueC = 0.8;
  var downEffectValueS = 0.9;
  var Button = class extends Label {
    constructor() {
      super();
      this._selected = false;
      this._titleStr = "";
      this._iconStr = "";
      this._selectedTitleStr = "";
      this._selectedIconStr = "";
      this._soundVolumeScale = 0;
      this._selectedPage = 0;
      this._downEffect = 0;
      this._scaleEffect = false;
      this._mode = 0 /* Common */;
      this._sound = UIConfig.buttonSound;
      this._soundVolumeScale = UIConfig.buttonSoundVolumeScale;
      this._changeStateOnClick = true;
      this.on("roll_over", this._rollover, this);
      this.on("roll_out", this._rollout, this);
      this.on("pointer_down", this._btnTouchBegin, this);
      this.on("pointer_up", this._btnTouchEnd, this);
      this.on("click", this._click, this);
      this.on("right_click", this._rightClick, this);
      this.on("removed_from_stage", this._removeFromStage, this);
    }
    destroy() {
      if (this._selectedController)
        this._selectedController.release();
      super.destroy();
    }
    get title() {
      return this._titleStr;
    }
    set title(value) {
      if (value == null)
        value = "";
      this._titleStr = value;
      super.title = this._selected && this._selectedTitleStr ? this._selectedTitleStr : value;
    }
    get selectedTitle() {
      return this._selectedTitleStr;
    }
    set selectedTitle(value) {
      if (value == null)
        value = "";
      this._selectedTitleStr = value;
      super.title = this._selected && this._selectedTitleStr ? value : this._titleStr;
    }
    get icon() {
      return this._iconStr;
    }
    set icon(value) {
      if (value == null)
        value = "";
      this._iconStr = value;
      super.icon = this._selected && this._selectedIconStr ? this._selectedIconStr : value;
    }
    get selectedIcon() {
      return this._selectedIconStr;
    }
    set selectedIcon(value) {
      if (value == null)
        value = "";
      this._selectedIconStr = value;
      super.icon = this._selected && this._selectedIconStr ? value : this._iconStr;
    }
    get downEffect() {
      return this._downEffect;
    }
    set downEffect(value) {
      this._downEffect = value;
    }
    get sound() {
      return this._sound;
    }
    set sound(val) {
      this._sound = val;
    }
    get soundVolumeScale() {
      return this._soundVolumeScale;
    }
    set soundVolumeScale(value) {
      this._soundVolumeScale = value;
    }
    get selected() {
      return this._selected;
    }
    set selected(value) {
      if (this._mode == 0 /* Common */)
        return;
      if (this._selected != value) {
        this._selected = value;
        this.setCurrentState();
        if (this._selectedTitleStr && this._titleWidget)
          this._titleWidget.p.text = this._selected ? this._selectedTitleStr : this._titleStr;
        if (this._selectedIconStr && this._iconWidget)
          this._iconWidget.p.icon = this._selected ? this._selectedIconStr : this._iconStr;
        if (this._selectedController) {
          if (this._selected) {
            this._selectedController.selectedIndex = this._selectedPage;
          } else if (this._mode == 1 /* Check */ && this._selectedController.selectedIndex == this._selectedPage)
            this._selectedController.oppositeIndex = this._selectedPage;
        }
      }
    }
    get mode() {
      return this._mode;
    }
    set mode(value) {
      if (this._mode != value) {
        if (value == 0 /* Common */)
          this.selected = false;
        this._mode = value;
      }
    }
    get selectedController() {
      return this._selectedController;
    }
    set selectedController(value) {
      if (this._selectedController)
        this._selectedController.release();
      this._selectedController = value;
      if (value) {
        value.validate();
        value.onChanged = this.selectChanged.bind(this);
        this.selectChanged();
      }
    }
    get selectedPage() {
      return this._selectedPage;
    }
    set selectedPage(value) {
      this._selectedPage = value;
      if (this._selectedController)
        this.selected = this._selectedPage == this._selectedController.selectedIndex;
    }
    get changeStateOnClick() {
      return this._changeStateOnClick;
    }
    set changeStateOnClick(value) {
      this._changeStateOnClick = value;
    }
    get touchable() {
      return super.touchable;
    }
    set touchable(value) {
      super.touchable = value;
      if (!this.touchable) {
        this._over = false;
        this.setCurrentState();
      }
    }
    fireClick(downEffect, clickCall) {
      if (this._mode !== 0 /* Common */)
        return;
      downEffect = downEffect || false;
      if (downEffect) {
        this.setState(2 /* Over */);
        Timers.add(100, 1, this.setState, this, 1 /* Down */);
        Timers.add(200, 1, () => {
          this.setState(0 /* Up */);
          if (clickCall)
            this.emit("click");
        });
      }
    }
    setState(page) {
      if (this._buttonController) {
        if (page >= this._buttonController.numPages) {
          page = ButtonPageAlternatives[page];
          if (page == null)
            return;
        }
        this._buttonController.selectedIndex = page;
      }
      if (this._downEffect == 1 /* Dark */) {
        let isDown = page == 1 /* Down */ || page == 3 /* SelectedOver */ || page == 5 /* SelectedDisabled */;
        if (!tmpColor2)
          tmpColor2 = new Color();
        for (let child of this.children) {
          if (child instanceof Image2 || child instanceof Shape) {
            if (isDown) {
              child[SaveColorSymbol] = child.color;
              tmpColor2.parse(child.color);
              tmpColor2.r *= downEffectValueC;
              tmpColor2.g *= downEffectValueC;
              tmpColor2.b *= downEffectValueC;
              child.color = tmpColor2.getHex();
            } else if (child[SaveColorSymbol])
              child.color = child[SaveColorSymbol];
          }
        }
      } else if (this._downEffect == 2 /* UpScale */ || this._downEffect == 3 /* DownScale */) {
        let rate = this._downEffect == 3 /* DownScale */ ? downEffectValueS : 1 / downEffectValueS;
        if (page == 1 /* Down */ || page == 3 /* SelectedOver */ || page == 5 /* SelectedDisabled */) {
          if (!this._scaleEffect) {
            this.setScale(this.scaleX * rate, this.scaleY * rate);
            this._scaleEffect = true;
          }
        } else {
          if (this._scaleEffect) {
            this.setScale(this.scaleX / rate, this.scaleY / rate);
            this._scaleEffect = false;
          }
        }
      }
    }
    setCurrentState() {
      if (this._selected)
        this.setState(this.grayed ? 5 /* SelectedDisabled */ : this._over ? 3 /* SelectedOver */ : 1 /* Down */);
      else
        this.setState(this.grayed ? 4 /* Disabled */ : this._over ? 2 /* Over */ : 0 /* Up */);
    }
    _controllersChanged() {
      super._controllersChanged();
      let c = this.getController("button");
      if (this._buttonController != c) {
        this._buttonController = c;
        this.setCurrentState();
      }
    }
    _onPartChanged(which) {
      if (which == "title") {
        if (this._titleStr)
          this.title = this._titleStr;
      } else if (which == "icon") {
        if (this._iconStr)
          this.icon = this._iconStr;
      }
    }
    selectChanged() {
      this.selected = this._selectedPage == this._selectedController.selectedIndex;
    }
    _rollover() {
      this._over = true;
      if (this._down)
        return;
      if (this.grayed)
        return;
      this.setState(this._selected ? 3 /* SelectedOver */ : 2 /* Over */);
    }
    _rollout() {
      this._over = false;
      if (this._down)
        return;
      if (this.grayed)
        return;
      this.setState(this._selected ? 1 /* Down */ : 0 /* Up */);
    }
    _btnTouchBegin(evt) {
      if (evt.input.button != 0)
        return;
      this._down = true;
      evt.capturePointer();
      if (this._mode == 0 /* Common */) {
        this.setState(this.grayed ? 5 /* SelectedDisabled */ : 1 /* Down */);
      }
    }
    _btnTouchEnd() {
      if (this._down) {
        this._down = false;
        if (this._mode == 0 /* Common */) {
          this.setState(this.grayed ? 4 /* Disabled */ : this._over ? 2 /* Over */ : 0 /* Up */);
        } else {
          if (!this._over && this._buttonController && (this._buttonController.selectedIndex == 2 /* Over */ || this._buttonController.selectedIndex == 3 /* SelectedOver */)) {
            this.setCurrentState();
          }
        }
      }
    }
    _removeFromStage() {
      if (this._over)
        this._rollout();
    }
    _click(evt) {
      if (this._sound)
        UIPackage.playSound(this._sound, this._soundVolumeScale);
      let ss = this.parent?.selection;
      if (ss && ss.mode != 0 /* None */) {
        ss.handleClick(this, evt);
        if (this._mode != 0 /* Common */)
          return;
      }
      if (this._mode == 1 /* Check */) {
        if (this._changeStateOnClick) {
          this.selected = !this._selected;
          this.emit("changed");
        }
      } else if (this._mode == 2 /* Radio */) {
        if (this._changeStateOnClick && !this._selected) {
          this.selected = true;
          this.emit("changed");
        }
      } else {
        if (this._selectedController)
          this._selectedController.selectedIndex = this._selectedPage;
      }
    }
    _rightClick(evt) {
      let ss = this.parent.selection;
      if (ss && ss.mode != 0 /* None */) {
        ss.handleClick(this, evt);
      }
    }
  };

  // src/ui/TreeNode.ts
  var TreeNode = class {
    constructor(isFolder, resURL, addIndent) {
      this._expanded = false;
      this._level = 0;
      this._indentLevel = 0;
      this._addIndent = 0;
      this._isFolder = isFolder;
      if (resURL)
        this._resURL = resURL;
      if (addIndent)
        this._addIndent = addIndent;
      this._children = [];
    }
    set expanded(value) {
      this._setExpanded(value);
    }
    _setExpanded(value, byEvent) {
      if (this._expanded != value) {
        this._expanded = value;
        if (this._tree && this.isFolder) {
          if (this._expanded)
            this._tree._afterExpanded(this, byEvent);
          else
            this._tree._afterCollapsed(this, byEvent);
        }
        if (this._expandCtrler)
          this._expandCtrler.selectedIndex = this.expanded ? 1 : 0;
      }
    }
    get expanded() {
      return this._expanded;
    }
    get isFolder() {
      return this._isFolder || this._children.length > 0;
    }
    set isFolder(value) {
      if (this._isFolder != value) {
        this._isFolder = value;
        if (this._leafController)
          this._leafController.selectedIndex = this.isFolder ? 0 : 1;
      }
    }
    get addIndent() {
      return this._addIndent;
    }
    set addIndent(value) {
      this._addIndent = value;
    }
    get parent() {
      return this._parent;
    }
    get text() {
      if (this._cell)
        return this._cell.text;
      else
        return null;
    }
    set text(value) {
      if (this._cell)
        this._cell.text = value;
    }
    get icon() {
      if (this._cell)
        return this._cell.icon;
      else
        return null;
    }
    set icon(value) {
      if (this._cell)
        this._cell.icon = value;
    }
    get cell() {
      return this._cell;
    }
    set cell(value) {
      if (this._cell) {
        this._cell.treeNode = null;
        this._indentObj = null;
        this._leafController = null;
        if (this._expandCtrler)
          this._expandCtrler.off("changed", this._expandedStateChanged, this);
        let btn = this._cell.findChild("expandButton");
        if (btn)
          btn.off("click", this._clickExpandButton, this);
        this._cell.off("pointer_down", this._cellMouseDown, this);
      }
      this._cell = value;
      this._cellFromPool = false;
      if (this._cell) {
        this._cell.treeNode = this;
        this._indentObj = this._cell.findChild("indent");
        if (this._tree && this._indentObj)
          this._indentObj.width = Math.max(this._indentLevel - 1, 0) * this._tree.indent;
        this._expandCtrler = this._cell.getController("expanded");
        if (this._expandCtrler) {
          this._expandCtrler.on("changed", this._expandedStateChanged, this);
          this._expandCtrler.selectedIndex = this.expanded ? 1 : 0;
        }
        let btn = this._cell.findChild("expandButton");
        if (btn)
          btn.on("click", this._clickExpandButton, this);
        this._leafController = this._cell.getController("leaf");
        if (this._leafController)
          this._leafController.selectedIndex = this.isFolder ? 0 : 1;
        this._cell.on("pointer_down", this._cellMouseDown, this);
      }
    }
    createCell(tree) {
      if (this._cell)
        return;
      let child = (this._tree || tree).itemPool.getObject(this._resURL ? this._resURL : "");
      if (!child)
        throw new Error("cannot create tree node object.");
      if (child instanceof Button)
        child.selected = false;
      child.visible = true;
      this.cell = child;
      this._cellFromPool = true;
    }
    get level() {
      return this._level;
    }
    addChild(child) {
      this.addChildAt(child, this._children.length);
      return child;
    }
    addChildAt(child, index) {
      if (!child)
        throw new Error("child is null");
      let numChildren = this._children.length;
      if (index >= 0 && index <= numChildren) {
        if (child._parent == this) {
          this.setChildIndex(child, index);
        } else {
          if (child._parent)
            child._parent.removeChild(child);
          if (index == numChildren)
            this._children.push(child);
          else
            this._children.splice(index, 0, child);
          if (this.isFolder && this._leafController)
            this._leafController.selectedIndex = 0;
          child._parent = this;
          child._level = this._level + 1;
          child._indentLevel = this._indentLevel + 1 + child._addIndent;
          child._setTree(this._tree);
          if (this._tree && this == this._tree.rootNode || this._cell && this._cell.parent && this._expanded)
            this._tree._afterInserted(child);
        }
        return child;
      } else {
        throw new Error(`Invalid child index ${index}`);
      }
    }
    removeChild(child) {
      let childIndex = this._children.indexOf(child);
      if (childIndex != -1) {
        this.removeChildAt(childIndex);
      }
      return child;
    }
    removeChildAt(index) {
      if (index >= 0 && index < this.numChildren) {
        let child = this._children[index];
        this._children.splice(index, 1);
        if (!this.isFolder && this._leafController)
          this._leafController.selectedIndex = 1;
        child._parent = null;
        if (this._tree) {
          child._setTree(null);
          this._tree._afterRemoved(child);
        }
        return child;
      } else {
        throw new Error(`Invalid child index ${index}`);
      }
    }
    removeChildren(beginIndex, endIndex) {
      beginIndex = beginIndex || 0;
      if (endIndex == null)
        endIndex = -1;
      if (endIndex < 0 || endIndex >= this.numChildren)
        endIndex = this.numChildren - 1;
      for (let i = beginIndex; i <= endIndex; ++i)
        this.removeChildAt(beginIndex);
    }
    getChildAt(index) {
      if (index >= 0 && index < this.numChildren)
        return this._children[index];
      else
        throw new Error(`Invalid child index ${index}`);
    }
    getChildIndex(child) {
      return this._children.indexOf(child);
    }
    getPrevSibling() {
      if (this._parent == null)
        return null;
      let i = this._parent._children.indexOf(this);
      if (i <= 0)
        return null;
      return this._parent._children[i - 1];
    }
    getNextSibling() {
      if (this._parent == null)
        return null;
      let i = this._parent._children.indexOf(this);
      if (i < 0 || i >= this._parent._children.length - 1)
        return null;
      return this._parent._children[i + 1];
    }
    getLastVisibleDecendant() {
      let ret = this.findLastVisibleChild(this);
      return ret === this ? null : ret;
    }
    findLastVisibleChild(parentNode) {
      for (let i = parentNode.children.length - 1; i >= 0; i--) {
        let node = parentNode.children[i];
        if (node.cell?.parent && node.cell.visible)
          return this.findLastVisibleChild(node) || node;
        else if (node.children.length > 0 && node.expanded) {
          let ret = this.findLastVisibleChild(node);
          if (ret)
            return ret;
        }
      }
      return null;
    }
    setChildIndex(child, index) {
      let oldIndex = this._children.indexOf(child);
      if (oldIndex == -1)
        throw new Error("Not a child of this container");
      let cnt = this._children.length;
      if (index < 0)
        index = 0;
      else if (index > cnt)
        index = cnt;
      if (oldIndex == index)
        return;
      this._children.splice(oldIndex, 1);
      this._children.splice(index, 0, child);
      if (this._tree && this == this._tree.rootNode || this._cell && this._cell.parent && this._expanded)
        this._tree._afterMoved(child);
    }
    swapChildren(child1, child2) {
      let index1 = this._children.indexOf(child1);
      let index2 = this._children.indexOf(child2);
      if (index1 == -1 || index2 == -1)
        throw new Error("Not a child of this container");
      this.swapChildrenAt(index1, index2);
    }
    swapChildrenAt(index1, index2) {
      let child1 = this._children[index1];
      let child2 = this._children[index2];
      this._children[index1] = child2;
      this._children[index2] = child1;
      if (this._tree && this == this._tree.rootNode || this._cell && this._cell.parent && this._expanded) {
        if (index1 < index2) {
          this._tree._afterMoved(child2);
          this._tree._afterMoved(child1);
        } else {
          this._tree._afterMoved(child1);
          this._tree._afterMoved(child2);
        }
      }
    }
    get numChildren() {
      return this._children.length;
    }
    get children() {
      return this._children;
    }
    expandToRoot() {
      let p = this;
      while (p) {
        p.expanded = true;
        p = p.parent;
      }
    }
    get tree() {
      return this._tree;
    }
    _setTree(value) {
      this._tree = value;
      if (this._tree && this._indentObj)
        this._indentObj.width = Math.max(this._indentLevel - 1, 0) * this._tree.indent;
      if (this._tree && this._tree.treeNodeWillExpand && this._expanded)
        this._tree.treeNodeWillExpand(this, true);
      let cnt = this._children.length;
      for (let i = 0; i < cnt; i++) {
        let node = this._children[i];
        node._level = this._level + 1;
        node._indentLevel = this._indentLevel + 1 + node._addIndent;
        node._setTree(value);
      }
    }
    _expandedStateChanged(evt) {
      let cc = evt.target;
      this._setExpanded(cc.selectedIndex == 1, true);
    }
    _cellMouseDown(evt) {
      if (this._tree && this.isFolder)
        this._tree.selection._expandedStatusInEvt = this._expanded;
    }
    _clickExpandButton(evt) {
      evt.stopPropagation();
    }
  };

  // src/ui/selection/Selection.ts
  var Selection = class {
    constructor(owner) {
      this.scrollItemToViewOnClick = false;
      this.allowSelectByRightClick = true;
      this._mode = 0;
      this._lastIndex = 0;
      this._owner = owner;
      this._lastIndex = -1;
    }
    get mode() {
      return this._mode;
    }
    set mode(value) {
      this._mode = value;
    }
    get index() {
      return this._owner.children.findIndex((obj) => obj instanceof Button && obj.selected);
    }
    set index(value) {
      if (value >= 0 && value < this._owner.numChildren) {
        if (this._mode != 1 /* Single */)
          this.clear();
        this.add(value);
      } else
        this.clear();
    }
    get controller() {
      return this._controller;
    }
    set controller(value) {
      if (this._controller)
        this._controller.release();
      this._controller = value;
      if (value) {
        value.validate();
        value.onChanged = this.selectChanged.bind(this);
        this.selectChanged();
      }
    }
    get(out) {
      if (!out)
        out = [];
      for (let i = 0, cnt = this._owner.children.length; i < cnt; i++) {
        let obj = this._owner.children[i];
        if (obj instanceof Button && obj.selected)
          out.push(i);
      }
      return out;
    }
    add(index, scrollItToView) {
      if (this._mode == 4 /* Disabled */)
        return;
      if (this._mode == 1 /* Single */)
        this.clear();
      if (scrollItToView)
        this._owner.scroller?.scrollTo(index);
      this._lastIndex = index;
      let obj;
      if (this._owner._getBit(NodeFlags.EDITING_NODE))
        obj = this._owner.children.filter((child) => !child._extra.isTemplateNode)[index];
      else
        obj = this._owner.getChildAt(index);
      if (obj instanceof Button && !obj.selected)
        obj.selected = true;
      this.syncController(index);
    }
    remove(index) {
      if (this._mode == 4 /* Disabled */)
        return;
      let obj;
      if (this._owner._getBit(NodeFlags.EDITING_NODE))
        obj = this._owner.children.filter((child) => !child._extra.isTemplateNode)[index];
      else
        obj = this._owner.getChildAt(index);
      if (obj instanceof Button)
        obj.selected = false;
    }
    clear() {
      for (let obj of this._owner.children) {
        if (obj instanceof Button && !obj._extra.isTemplateNode)
          obj.selected = false;
      }
    }
    clearExcept(g) {
      for (let obj of this._owner.children) {
        if (obj instanceof Button && obj != g && !obj._extra.isTemplateNode)
          obj.selected = false;
      }
    }
    selectAll() {
      for (let obj of this._owner.children) {
        if (obj instanceof Button && !obj.selected) {
          obj.selected = true;
        }
      }
    }
    selectReverse() {
      for (let obj of this._owner.children) {
        if (obj instanceof Button) {
          obj.selected = !obj.selected;
        }
      }
    }
    enableFocusEvents(enabled) {
      if (this._triggerFocusEvents == enabled)
        return;
      this._triggerFocusEvents = enabled;
      if (enabled) {
        this._owner.tabStopChildren = true;
        this._owner.on("focus_in", this.handleFocus, this);
        this._owner.on("focus_out", this.handleFocus, this);
      } else {
        this._owner.off("focus_in", this.handleFocus, this);
        this._owner.off("focus_out", this.handleFocus, this);
      }
    }
    handleFocus(evt) {
      let eventType = evt.type == "focus_in" ? "list_focus_in" : "list_focus_out";
      for (let obj of this._owner.children) {
        if (obj instanceof Button && obj.selected)
          obj.emit(eventType);
      }
    }
    handleClick(item, evt) {
      let scroller = this._owner.scroller;
      if (scroller?.isDragged)
        return;
      if (evt.input.isRightButton && !this.allowSelectByRightClick)
        return;
      if (item.mode == 0 /* Common */) {
        this._owner.emit("click_item", item);
        return;
      }
      let dontChangeLastIndex = false;
      let index = this._owner.getChildIndex(item);
      if (this._mode == 4 /* Disabled */) {
      } else if (this._mode == 1 /* Single */) {
        if (!item.selected) {
          this.clearExcept(item);
          item.selected = true;
          item.emit("changed");
        }
      } else {
        if (evt.input.shiftKey) {
          if (!item.selected) {
            if (this._lastIndex != -1) {
              let min = Math.min(this._lastIndex, index);
              let max = Math.max(this._lastIndex, index);
              max = Math.min(max, this._owner.numChildren - 1);
              for (let i = min; i <= max; i++) {
                let obj = this._owner.getChildAt(i);
                if (obj instanceof Button) {
                  obj.selected = true;
                  if (obj == item)
                    item.emit("changed");
                }
              }
              dontChangeLastIndex = true;
            } else {
              item.selected = true;
              item.emit("changed");
            }
          }
        } else if (evt.input.ctrlKey || evt.input.commandKey || this._mode == 3 /* MultipleBySingleClick */) {
          item.selected = !item.selected;
          item.emit("changed");
        } else {
          if (!item.selected) {
            this.clearExcept(item);
            item.selected = true;
            item.emit("changed");
          } else if (evt.input.button == 0)
            this.clearExcept(item);
        }
      }
      if (!dontChangeLastIndex)
        this._lastIndex = index;
      if (scroller && this.scrollItemToViewOnClick)
        scroller.scrollTo(item, true);
      if (item.selected)
        this.syncController(index);
      if (evt.input.isDblClick && evt.initiator instanceof TextInput)
        return;
      this._owner.emit("click_item", item);
    }
    enableArrowKeyNavigation(enabled, keySelectEvent) {
      if (enabled) {
        this._owner.tabStopChildren = true;
        this._keyEvent = keySelectEvent != null ? keySelectEvent : "click_item";
        this._owner.on("key_down", this._keydown, this);
      } else {
        this._owner.tabStopChildren = false;
        this._owner.off("key_down", this._keydown, this);
      }
    }
    _keydown(evt) {
      if (evt.initiator instanceof TextInput || evt.input.ctrlOrCmdKey || evt.input.altKey || evt.input.shiftKey)
        return;
      let index = -1;
      switch (evt.input.keyCode) {
        case "ArrowLeft":
          index = this.handleArrowKey(7);
          break;
        case "ArrowRight":
          index = this.handleArrowKey(3);
          break;
        case "ArrowUp":
          index = this.handleArrowKey(1);
          break;
        case "ArrowDown":
          index = this.handleArrowKey(5);
          break;
      }
      if (index != -1)
        evt.stopPropagation();
    }
    handleArrowKey(dir) {
      let curIndex = this.index;
      if (curIndex == -1) {
        if (this._owner.numChildren > 0) {
          this.clear();
          this.add(0, true);
          if (this._keyEvent)
            this._owner.emit(this._keyEvent, this._owner.getChildAt(0));
          return 0;
        } else
          return -1;
      }
      let index = curIndex;
      let layout = this._owner.layout?.type;
      if (layout == null)
        layout = 3 /* FlowX */;
      switch (dir) {
        case 1:
          if (layout == 1 /* SingleColumn */ || layout == 4 /* FlowY */) {
            index--;
          } else if (layout == 3 /* FlowX */) {
            let current = this._owner.getChildAt(index);
            let k = 0;
            let i;
            for (i = index - 1; i >= 0; i--) {
              let obj = this._owner.getChildAt(i);
              if (obj.y != current.y) {
                current = obj;
                break;
              }
              k++;
            }
            for (; i >= 0; i--) {
              let obj = this._owner.getChildAt(i);
              if (obj.y != current.y) {
                index = i + k + 1;
                break;
              }
            }
          }
          break;
        case 3:
          if (layout == 2 /* SingleRow */ || layout == 3 /* FlowX */) {
            index++;
          } else if (layout == 4 /* FlowY */) {
            let current = this._owner.getChildAt(index);
            let k = 0;
            let i;
            let cnt = this._owner.numChildren;
            for (i = index + 1; i < cnt; i++) {
              let obj = this._owner.getChildAt(i);
              if (obj.x != current.x) {
                current = obj;
                break;
              }
              k++;
            }
            for (; i < cnt; i++) {
              let obj = this._owner.getChildAt(i);
              if (obj.x != current.x) {
                index = i - k - 1;
                break;
              }
            }
          }
          break;
        case 5:
          if (layout == 1 /* SingleColumn */ || layout == 4 /* FlowY */) {
            index++;
          } else if (layout == 3 /* FlowX */) {
            let current = this._owner.getChildAt(index);
            let k = 0;
            let i;
            let cnt = this._owner.numChildren;
            for (i = index + 1; i < cnt; i++) {
              let obj = this._owner.getChildAt(i);
              if (obj.y != current.y) {
                current = obj;
                break;
              }
              k++;
            }
            for (; i < cnt; i++) {
              let obj = this._owner.getChildAt(i);
              if (obj.y != current.y) {
                index = i - k - 1;
                break;
              }
            }
          }
          break;
        case 7:
          if (layout == 2 /* SingleRow */ || layout == 3 /* FlowX */) {
            index--;
          } else if (layout == 4 /* FlowY */) {
            let current = this._owner.getChildAt(index);
            let k = 0;
            let i;
            for (i = index - 1; i >= 0; i--) {
              let obj = this._owner.getChildAt(i);
              if (obj.x != current.x) {
                current = obj;
                break;
              }
              k++;
            }
            for (; i >= 0; i--) {
              let obj = this._owner.getChildAt(i);
              if (obj.x != current.x) {
                index = i + k + 1;
                break;
              }
            }
          }
          break;
      }
      if (index != curIndex && index >= 0 && index < this._owner.numChildren) {
        this.clear();
        this.add(index, true);
        if (this._keyEvent) {
          this._owner.emit(this._keyEvent, this._owner.getChildAt(index));
        }
        return index;
      } else
        return -1;
    }
    selectChanged() {
      if (this._controller)
        this.index = this._controller.selectedIndex;
    }
    syncController(index) {
      let cc = this._controller;
      if (cc) {
        this._controller = null;
        cc.selectedIndex = index;
        this._controller = cc;
      }
    }
    _refresh() {
      if (this._mode === 0 /* None */)
        return;
      if (this._controller)
        this.index = this._controller.selectedIndex;
      else
        this.index = this._lastIndex;
    }
    destroy() {
      if (this._controller)
        this._controller.release();
    }
  };

  // src/ui/selection/TreeSelection.ts
  var TreeSelection = class extends Selection {
    constructor() {
      super(...arguments);
      this._clickToExpand = 0;
    }
    get clickToExpand() {
      return this._clickToExpand;
    }
    set clickToExpand(value) {
      this._clickToExpand = value;
    }
    getSelectedNode() {
      let i = this.index;
      if (i != -1)
        return this._owner.getChildAt(i).treeNode;
      else
        return null;
    }
    getSelectedNodes(out) {
      if (!out)
        out = [];
      s_list.length = 0;
      this.get(s_list);
      let cnt = s_list.length;
      let ret = [];
      for (let i = 0; i < cnt; i++) {
        let node = this._owner.getChildAt(s_list[i]).treeNode;
        ret.push(node);
      }
      return ret;
    }
    selectNode(node, scrollItToView) {
      let parentNode = node.parent;
      while (parentNode && parentNode != this._owner.rootNode) {
        parentNode.expanded = true;
        parentNode = parentNode.parent;
      }
      if (!node.cell)
        return;
      this.add(this._owner.getChildIndex(node.cell), scrollItToView);
    }
    unselectNode(node) {
      if (!node.cell)
        return;
      this.remove(this._owner.getChildIndex(node.cell));
    }
    handleClick(item, evt) {
      let scroller = this._owner.scroller;
      if (scroller?.isDragged)
        return;
      if (evt.input.isRightButton && !this.allowSelectByRightClick)
        return;
      if (this._clickToExpand != 0) {
        let node = item.treeNode;
        if (node && node.isFolder && this._expandedStatusInEvt == node.expanded) {
          if (this._clickToExpand == 2) {
            if (evt.input.clickCount == 2)
              node._setExpanded(!node.expanded, true);
          } else
            node._setExpanded(!node.expanded, true);
        }
      }
      super.handleClick(item, evt);
    }
    handleArrowKey(dir) {
      if (dir == 3 || dir == 7) {
        let i = this.index;
        if (i != -1) {
          let node = this._owner.getChildAt(i).treeNode;
          if (node.isFolder) {
            node.expanded = dir == 3;
            return i;
          }
        }
      }
      return super.handleArrowKey(dir);
    }
  };
  var s_list = [];

  // src/math/StretchParam.ts
  var StretchParam = class {
    constructor() {
      this.ratio = 0;
      this.priority = 0;
      this.min = 0;
      this.max = 0;
    }
    setRatio(value) {
      this.ratio = value;
      return this;
    }
    setPriority(value) {
      this.priority = value;
      return this;
    }
    setLimit(min, max) {
      this.min = min;
      this.max = max;
      return this;
    }
    setFixed() {
      this.fixed = true;
      return this;
    }
  };

  // src/ui/layout/Layout.ts
  var Layout = class _Layout {
    constructor(owner) {
      this._type = 0;
      this._rows = 0;
      this._columns = 0;
      this._rowGap = 0;
      this._columnGap = 0;
      this._stretchX = 0;
      this._stretchY = 0;
      this._pageMode = false;
      this._align = 0;
      this._valign = 0;
      this._minChildSize = 0;
      this._contentWidth = 0;
      this._contentHeight = 0;
      this._owner = owner;
      this._padding = [0, 0, 0, 0];
      this._stretchParamsX = hookSetter([], this.setChangedFlag, this);
      this._stretchParamsY = hookSetter([], this.setChangedFlag, this);
    }
    get type() {
      return this._type;
    }
    set type(value) {
      if (this._type != value) {
        this._type = value;
        if (!SerializeUtil.isDeserializing) {
          this._owner.scroller?._setDefaultDirection();
          switch (value) {
            case 1 /* SingleColumn */:
            case 3 /* FlowX */:
              this._stretchY = 0 /* None */;
              break;
            case 2 /* SingleRow */:
            case 4 /* FlowY */:
              this._stretchX = 0 /* None */;
              break;
          }
        }
        this.setChangedFlag();
      }
    }
    get rows() {
      return this._rows;
    }
    set rows(value) {
      if (this._rows != value) {
        this._rows = value;
        this.setChangedFlag();
      }
    }
    get columns() {
      return this._columns;
    }
    set columns(value) {
      if (this._columns != value) {
        this._columns = value;
        this.setChangedFlag();
      }
    }
    get rowGap() {
      return this._rowGap;
    }
    set rowGap(value) {
      if (this._rowGap != value) {
        this._rowGap = value;
        this.setChangedFlag();
      }
    }
    get columnGap() {
      return this._columnGap;
    }
    set columnGap(value) {
      if (this._columnGap != value) {
        this._columnGap = value;
        this.setChangedFlag();
      }
    }
    get padding() {
      return this._padding;
    }
    set padding(value) {
      if (value == null || !Array.isArray(value))
        value = [0, 0, 0, 0];
      this._padding = value;
      this.setChangedFlag();
      this._owner.scroller?._ownerSizeChanged();
    }
    getPaddingX() {
      return this._padding[3] + this._padding[1] + (this._owner.scroller?._extraPaddingX || 0);
    }
    getPaddingY() {
      return this._padding[0] + this._padding[2] + (this._owner.scroller?._extraPaddingY || 0);
    }
    get align() {
      return this._align;
    }
    set align(value) {
      if (this._align != value) {
        this._align = value;
        this.setChangedFlag();
      }
    }
    get valign() {
      return this._valign;
    }
    set valign(value) {
      if (this._valign != value) {
        this._valign = value;
        this.setChangedFlag();
      }
    }
    get stretchX() {
      return this._stretchX;
    }
    set stretchX(value) {
      if (this._stretchX != value) {
        this._stretchX = value;
        this.setChangedFlag();
      }
    }
    get stretchY() {
      return this._stretchY;
    }
    set stretchY(value) {
      if (this._stretchY != value) {
        this._stretchY = value;
        this.setChangedFlag();
      }
    }
    get stretchParamsX() {
      return this._stretchParamsX;
    }
    /** @internal */
    set stretchParamsX(value) {
      this._stretchParamsX.length = 0;
      this._stretchParamsX.push(...value);
    }
    get stretchParamsY() {
      return this._stretchParamsY;
    }
    /** @internal */
    set stretchParamsY(value) {
      this._stretchParamsY.length = 0;
      this._stretchParamsY.push(...value);
    }
    get foldInvisibles() {
      return this._foldInvisibles;
    }
    set foldInvisibles(value) {
      if (this._foldInvisibles != value) {
        this._foldInvisibles = value;
        this.setChangedFlag();
      }
    }
    get minChildSize() {
      return this._minChildSize;
    }
    set minChildSize(value) {
      if (this._minChildSize != value) {
        this._minChildSize = value;
        this.setChangedFlag();
      }
    }
    get pageMode() {
      return this._pageMode;
    }
    set pageMode(value) {
      if (this._pageMode != value) {
        this._pageMode = value;
        this.setChangedFlag();
      }
    }
    /**
     * dir正数表示右移或者下移，负数表示左移或者上移
     */
    getSnappingPosition(xValue, yValue, xDir, yDir, resultPoint) {
      if (!resultPoint)
        resultPoint = new Vec2();
      let children = this._owner.children;
      let cnt = children.length;
      if (cnt === 0) {
        resultPoint.x = 0;
        resultPoint.y = 0;
        return resultPoint;
      }
      this.refresh();
      let obj = null;
      let prev = null;
      let i = 0;
      if (yValue != 0) {
        for (; i < cnt; i++) {
          obj = children[i];
          if (yValue < obj.y) {
            if (i === 0) {
              yValue = 0;
              break;
            } else {
              prev = children[i - 1];
              if (yValue < prev.y + prev.height / 2)
                yValue = prev.y;
              else
                yValue = obj.y;
              break;
            }
          }
        }
        if (i === cnt)
          yValue = obj.y;
      }
      if (xValue != 0) {
        if (i > 0)
          i--;
        for (; i < cnt; i++) {
          obj = children[i];
          if (xValue < obj.x) {
            if (i === 0) {
              xValue = 0;
              break;
            } else {
              prev = children[i - 1];
              if (xValue < prev.x + prev.width / 2)
                xValue = prev.x;
              else
                xValue = obj.x;
              break;
            }
          }
        }
        if (i === cnt)
          xValue = obj.x;
      }
      resultPoint.x = xValue;
      resultPoint.y = yValue;
      return resultPoint;
    }
    setChangedFlag(reason) {
      if (this._layoutChanged)
        return;
      let layout = this._type;
      if (layout === 0 /* None */ && !this._owner.scroller)
        return;
      if (reason === 2 /* Visible */ && !this._foldInvisibles)
        return;
      if (reason === 1 /* Pos */ && layout != 0 /* None */)
        return;
      if (reason === 0 /* Size */)
        this._childSizeChangedFlag = true;
      this._layoutChanged = true;
      if (_dirtyLayouts.indexOf(this) === -1) {
        _dirtyLayouts.push(this);
        if (!_timerAdded) {
          _timerAdded = true;
          Timers.add(0, 1, _Layout.refreshAllLayouts);
        }
      }
    }
    refresh(force) {
      if (this._owner.destroyed || this._disabled) {
        this._layoutChanged = false;
        return;
      }
      if (force) {
        if (!this._layoutChanged)
          this._childSizeChangedFlag = true;
      } else if (!this._layoutChanged || this._refreshing)
        return;
      this._refreshing = true;
      switch (this._type) {
        case 0 /* None */:
          this.applyNone();
          break;
        case 2 /* SingleRow */:
          this.applyFlowX(true);
          break;
        case 1 /* SingleColumn */:
          this.applyFlowY(true);
          break;
        case 3 /* FlowX */:
          this.applyFlowX();
          break;
        case 4 /* FlowY */:
          this.applyFlowY();
          break;
      }
      this._refreshing = false;
      this._layoutChanged = false;
      this._childSizeChangedFlag = false;
    }
    get viewWidth() {
      return this._owner.width - this.getPaddingX();
    }
    set viewWidth(value) {
      this._owner.width = value + this.getPaddingX();
    }
    get viewHeight() {
      return this._owner.height - this.getPaddingY();
    }
    set viewHeight(value) {
      this._owner.height = value + this.getPaddingY();
    }
    get contentWidth() {
      return this._contentWidth;
    }
    get contentHeight() {
      return this._contentHeight;
    }
    setContentSize(aw, ah) {
      this._contentWidth = aw;
      this._contentHeight = ah;
      if (aw != 0 && ah != 0) {
        if (this._stretchX === 2 /* ResizeToFit */ && this._stretchY === 2 /* ResizeToFit */) {
          this._owner.setSize(aw + this.getPaddingX(), ah + this.getPaddingY());
        } else if (this._stretchX === 2 /* ResizeToFit */)
          this.viewWidth = aw;
        else if (this._stretchY === 2 /* ResizeToFit */)
          this.viewHeight = ah;
      }
      this._owner.scroller?._ownerContentSizeChanged();
      this._owner.emit("content_size_changed");
    }
    calculateFitSize(childCount, minSize) {
      this.refresh();
      let curCount = this._owner.numChildren;
      if (childCount == null || childCount > curCount)
        childCount = curCount;
      minSize = minSize || 0;
      let size = 0;
      if (childCount === 0) {
        size = minSize;
      } else {
        let i = childCount - 1;
        let obj = null;
        while (i >= 0) {
          obj = this._owner.getChildAt(i);
          if ((!this._foldInvisibles || obj.element.visible) && !obj._getBit(NodeFlags.ESCAPE_LAYOUT))
            break;
          i--;
        }
        if (i < 0) {
          size = minSize;
        } else {
          if (this._type === 1 /* SingleColumn */ || this._type === 3 /* FlowX */) {
            size = obj.y + obj.height;
            if (size < minSize)
              size = minSize;
          } else {
            size = obj.x + obj.width;
            if (size < minSize)
              size = minSize;
          }
        }
      }
      if (this._type === 1 /* SingleColumn */ || this._type === 3 /* FlowX */)
        size += this.getPaddingY();
      else
        size += this.getPaddingX();
      return size;
    }
    resizeToFit(childCount, minSize) {
      let n = this.calculateFitSize(childCount, minSize);
      if (this._type === 1 /* SingleColumn */ || this._type === 3 /* FlowX */)
        this._owner.height = n;
      else
        this._owner.width = n;
    }
    applyNone() {
      this._owner.getChildrenBounds(false, this._foldInvisibles, false, s_rect3);
      this.setContentSize(Math.max(0, Math.ceil(s_rect3.xMax)), Math.max(0, Math.ceil(s_rect3.yMax)));
    }
    applyFlowX(singleRow) {
      let rows = this._rows;
      let cols = this._columns;
      let pageMode = this._pageMode;
      if (singleRow) {
        rows = 1;
        if (cols === 0 && !pageMode)
          cols = 1e6;
      }
      let rowGap = this._rowGap;
      let colGap = this._columnGap;
      let stretchX = this._stretchX === 1 /* Stretch */;
      let stretchY = this._stretchY === 1 /* Stretch */;
      let align = stretchX ? 0 : this._align;
      let valign = stretchY ? 0 : this._valign;
      let data = tempDataPool.borrow();
      let cnt = this.getLayoutChildren(data);
      let children = data.children;
      let vw = this.viewWidth, vh = this.viewHeight;
      let cx = 0, cy = 0;
      let px = 0, py = 0;
      let ci = 0, ri = 0;
      let cw = 0, ch = 0;
      let mh = 0;
      let pi = 0;
      if (stretchX) {
        if (cols === 0 || cnt < cols)
          cols = cnt;
        let stretchParamsX = this.checkStretchParams(this._stretchParamsX, data);
        for (let i = 0; i < cols; i++)
          data.swidth[i] = this._childSizeChangedFlag ? children[i].width : children[i]._giveWidth;
        this.handleStrecth(vw, cols, colGap, stretchParamsX, data.swidth, data.width);
      }
      if (cnt > 0 && stretchY) {
        if (rows === 0)
          rows = 1;
        for (let i = 0; i < rows; i++)
          data.sheight[i] = this._childSizeChangedFlag ? children[0].height : children[0]._giveHeight;
        this.handleStrecth(vh, rows, rowGap, this._stretchParamsY, data.sheight, data.height);
      }
      function newLine(i) {
        mh = Math.ceil(mh);
        if (cy != 0)
          cy += rowGap;
        if (cx > cw)
          cw = cx;
        if (align === 1)
          cx = Math.floor((vw - cx) / 2);
        else if (align === 2)
          cx = vw - cx;
        else
          cx = 0;
        if (pageMode) {
          if ((cy + mh > vh || ri === rows) && cy != 0) {
            px += vw;
            cy = 0;
            pi++;
            ri = 0;
          }
        }
        for (let j = i - ci; j < i; j++) {
          data.posx[j] += px + cx;
          data.posy[j] += py + cy;
        }
        cx = 0;
        cy += mh;
        mh = 0;
        ci = 0;
        ri++;
      }
      for (let x = 0; x < 2; x++) {
        for (let i = 0; i < cnt; i++) {
          let child = children[i];
          child.setSize(stretchX ? data.width[ci % cols] : child._giveWidth, stretchY ? data.height[ri % rows] : child._giveHeight, true);
          let sw = Math.ceil(child.width);
          if (cols === 0 && cx + colGap + sw > vw && cx != 0) {
            newLine(i);
            child.setSize(stretchX ? data.width[ci] : child._giveWidth, stretchY ? data.height[ri % rows] : child._giveHeight, true);
            sw = Math.ceil(child.width);
          }
          if (cx != 0)
            cx += colGap;
          data.posx[i] = cx;
          data.posy[i] = 0;
          if (singleRow) {
            if (valign === 1)
              data.posy[i] = Math.floor((vh - child.height) / 2);
            else if (valign === 2)
              data.posy[i] = vh - child.height;
          }
          cx += sw;
          if (child.height > mh)
            mh = child.height;
          ci++;
          if (ci === cols && !singleRow || i === cnt - 1)
            newLine(i + 1);
        }
        ch = py + cy;
        let checkOverflow = this._owner.scroller?._shouldCheckOverflow();
        if (checkOverflow == null)
          break;
        if (ch <= vh && stretchX && (checkOverflow & 1) != 0) {
          vw += this._owner.scroller.vScrollBar.width;
          this.handleStrecth(vw, cols, colGap, this._stretchParamsX, data.swidth, data.width);
        } else
          checkOverflow &= ~1;
        if (cw <= vw && stretchY && (checkOverflow & 2) != 0) {
          vh += this._owner.scroller.hScrollBar.height;
          this.handleStrecth(vh, rows, rowGap, this._stretchParamsY, data.sheight, data.height);
        } else
          checkOverflow &= ~2;
        if (checkOverflow === 0)
          break;
        cx = cy = px = py = ci = ri = cw = ch = mh = 0;
      }
      cy = 0;
      if (ch < vh && this._stretchY !== 2 /* ResizeToFit */ && !singleRow) {
        if (valign === 1)
          cy = Math.floor((vh - ch) / 2);
        else if (valign === 2)
          cy = vh - ch;
      }
      cx = 0;
      if (this._stretchX === 2 /* ResizeToFit */ && cw < vw) {
        if (align === 1)
          cx = Math.floor((cw - vw) / 2);
        else if (align === 2)
          cx = cw - vw;
      }
      if (!this._owner.scroller) {
        cx += this._padding[3];
        cy += this._padding[0];
      }
      if (singleRow && !stretchY && valign === 3) {
        for (let i = 0; i < cnt; i++)
          children[i].left = data.posx[i] + cx;
      } else {
        for (let i = 0; i < cnt; i++)
          children[i].setLeftTop(data.posx[i] + cx, data.posy[i] + cy);
      }
      if (pageMode)
        cw = vw * (pi + 1);
      this.setContentSize(cw, ch);
      tempDataPool.returns(data);
    }
    applyFlowY(singleColumn) {
      let rows = this._rows;
      let cols = this._columns;
      let pageMode = this._pageMode;
      if (singleColumn) {
        cols = 1;
        if (rows === 0 && !pageMode)
          rows = 1e6;
      }
      let rowGap = this._rowGap;
      let colGap = this._columnGap;
      let stretchX = this._stretchX === 1 /* Stretch */;
      let stretchY = this._stretchY === 1 /* Stretch */;
      let align = stretchX ? 0 : this._align;
      let valign = stretchY ? 0 : this._valign;
      let data = tempDataPool.borrow();
      let cnt = this.getLayoutChildren(data);
      let children = data.children;
      let vw = this.viewWidth, vh = this.viewHeight;
      let cx = 0, cy = 0;
      let px = 0, py = 0;
      let ci = 0, ri = 0;
      let cw = 0, ch = 0;
      let mw = 0;
      let pi = 0;
      if (cnt > 0 && stretchX) {
        if (cols === 0)
          cols = 1;
        for (let i = 0; i < cols; i++)
          data.swidth[i] = this._childSizeChangedFlag ? children[0].width : children[0]._giveWidth;
        this.handleStrecth(vw, cols, colGap, this._stretchParamsX, data.swidth, data.width);
      }
      if (stretchY) {
        if (rows === 0 || cnt < rows)
          rows = cnt;
        let stretchParamsY = this.checkStretchParams(this._stretchParamsY, data);
        for (let i = 0; i < rows; i++)
          data.sheight[i] = this._childSizeChangedFlag ? children[i].height : children[i]._giveHeight;
        this.handleStrecth(vh, rows, rowGap, stretchParamsY, data.sheight, data.height);
      }
      function newLine(i) {
        mw = Math.ceil(mw);
        if (cx != 0)
          cx += colGap;
        if (cy > ch)
          ch = cy;
        if (valign === 1)
          cy = Math.floor((vh - cy) / 2);
        else if (valign === 2)
          cy = vh - cy;
        else
          cy = 0;
        if (pageMode) {
          if ((cx + mw > vw || ci === cols) && cx != 0) {
            py += vh;
            cx = 0;
            pi++;
            ci = 0;
          }
        }
        for (let j = i - ri; j < i; j++) {
          data.posx[j] += px + cx;
          data.posy[j] += py + cy;
        }
        cy = 0;
        cx += mw;
        mw = 0;
        ri = 0;
        ci++;
      }
      for (let x = 0; x < 2; x++) {
        for (let i = 0; i < cnt; i++) {
          let child = children[i];
          child.setSize(stretchX ? data.width[ci % cols] : child._giveWidth, stretchY ? data.height[ri % rows] : child._giveHeight, true);
          let sh = Math.ceil(child.height);
          if (rows === 0 && cy + rowGap + sh > vh && cy != 0) {
            newLine(i);
            child.setSize(stretchX ? data.width[ci % cols] : child._giveWidth, stretchY ? data.height[ri] : child._giveHeight, true);
            sh = Math.ceil(child.height);
          }
          if (cy != 0)
            cy += rowGap;
          data.posx[i] = 0;
          data.posy[i] = cy;
          if (singleColumn) {
            if (align === 1)
              data.posx[i] = Math.floor((vw - child.width) / 2);
            else if (align === 2)
              data.posx[i] = vw - child.width;
          }
          cy += sh;
          if (child.width > mw)
            mw = child.width;
          ri++;
          if (ri === rows && !singleColumn || i === cnt - 1)
            newLine(i + 1);
        }
        cw = px + cx;
        let checkOverflow = this._owner.scroller?._shouldCheckOverflow();
        if (checkOverflow == null)
          break;
        if (ch <= vh && stretchX && (checkOverflow & 1) != 0) {
          vw += this._owner.scroller.vScrollBar.width;
          this.handleStrecth(vw, cols, colGap, this._stretchParamsX, data.swidth, data.width);
        } else
          checkOverflow &= ~1;
        if (cw <= vw && stretchY && (checkOverflow & 2) != 0) {
          vh += this._owner.scroller.hScrollBar.height;
          this.handleStrecth(vh, rows, rowGap, this._stretchParamsY, data.sheight, data.height);
        } else
          checkOverflow &= ~2;
        if (checkOverflow === 0)
          break;
        cx = cy = px = py = ci = ri = cw = ch = mw = 0;
      }
      cx = 0;
      if (cw < vw && this._stretchX !== 2 /* ResizeToFit */ && !singleColumn) {
        if (align === 1)
          cx = Math.floor((vw - cw) / 2);
        else if (align === 2)
          cx = vw - cw;
      }
      cy = 0;
      if (this._stretchY === 2 /* ResizeToFit */ && ch < vh) {
        if (valign === 1)
          cy = Math.floor((ch - vh) / 2);
        else if (valign === 2)
          cy = ch - vh;
      }
      if (!this._owner.scroller) {
        cx += this._padding[3];
        cy += this._padding[0];
      }
      if (singleColumn && !stretchX && align === 3) {
        for (let i = 0; i < cnt; i++)
          children[i].top = data.posy[i] + cy;
      } else {
        for (let i = 0; i < cnt; i++)
          children[i].setLeftTop(data.posx[i] + cx, data.posy[i] + cy);
      }
      if (pageMode)
        ch = vh * (pi + 1);
      this.setContentSize(cw, ch);
      tempDataPool.returns(data);
    }
    getLayoutChildren(data) {
      let i = 0, j = 0;
      data.invisibleCnt = 0;
      for (let child of this._owner.children) {
        if (this._foldInvisibles && !child.element.visible || child._getBit(NodeFlags.ESCAPE_LAYOUT))
          data.invisibles[data.invisibleCnt++] = i;
        else
          data.children[j++] = child;
        i++;
      }
      return j;
    }
    checkStretchParams(src, data) {
      if (data.invisibleCnt === 0)
        return src;
      let out = data.stretchParams;
      let j = 0, k = 0;
      let test = data.invisibles[j];
      for (let i = 0; i < src.length; i++) {
        if (i != test)
          out[k++] = src[i];
        else {
          j++;
          if (j >= data.invisibleCnt)
            test = -1;
          else
            test = data.invisibles[j];
        }
      }
      return out;
    }
    handleStrecth(size, count, gap, params, sourceSizes, outSizes) {
      outSizes = outSizes || sourceSizes;
      if (count === 1 && !params[0]) {
        outSizes[0] = size;
        return;
      }
      let lineSize = Math.max(0, size - gap * (count - 1));
      let minChildSize = this._minChildSize;
      let lineSize2 = 0;
      let lineSize3 = 0;
      let ratio = 0;
      let hasRatio;
      for (let i = 0; i < count; i++) {
        let param = params[i] || defParam;
        if (param.ratio != 0) {
          hasRatio = true;
          ratio += param.ratio;
        } else
          lineSize3 += sourceSizes[i];
      }
      ratio = Math.max(0, 1 - ratio);
      for (let i = 0; i < count; i++) {
        let param = params[i] || defParam;
        let itemSize = sourceSizes[i];
        if (hasRatio) {
          if (param.ratio != 0)
            itemSize = Math.floor(lineSize * param.ratio);
          else
            itemSize = ratio * (itemSize / lineSize3);
        }
        if (!param.fixed) {
          let min = param.min != 0 ? param.min : minChildSize;
          if (itemSize < min)
            itemSize = min;
          if (param.max > 0 && itemSize > param.max)
            itemSize = param.max;
        }
        outSizes[i] = itemSize;
        lineSize2 += itemSize;
      }
      let dist = lineSize2 - lineSize;
      if (dist > 0) {
        let round = 0;
        while (dist > 0) {
          let k = 0;
          let lineSize32 = 0;
          for (let i = 0; i < count; i++) {
            let param = params[i] || defParam;
            if (param.fixed) {
              limit[i] = null;
              continue;
            }
            let min = param.min != 0 ? param.min : minChildSize;
            let ts = outSizes[i];
            if (ts > min && (round >= 2 || round === 0 && param.priority > 0 || round === 1 && (param == defParam || param.ratio === 0 && param.priority >= 0))) {
              limit[i] = min;
              lineSize32 += ts;
              k++;
            } else
              limit[i] = null;
          }
          if (k === 0) {
            round++;
            if (round > 2)
              break;
            else
              continue;
          }
          let ps = dist / k;
          let ps2 = 0;
          for (let i = 0; i < count; i++) {
            let min = limit[i];
            if (min == null)
              continue;
            ps2 += ps;
            k--;
            if (ps2 < 0) {
              if (k != 0)
                continue;
              else
                ps2 = Math.floor(ps2);
            }
            let ts = outSizes[i];
            ps2 = Math.ceil(ps2);
            ts = Math.max(ts - ps2, min);
            ps2 = ps - ps2;
            dist -= outSizes[i] - ts;
            outSizes[i] = ts;
          }
          dist = Math.floor(dist);
          round++;
        }
      } else if (dist < 0) {
        let round = 0;
        dist = -dist;
        while (dist > 0) {
          let k = 0;
          let lineSize32 = 0;
          for (let i = 0; i < count; i++) {
            let param = params[i] || defParam;
            ;
            if (param.fixed) {
              limit[i] = null;
              continue;
            }
            let max = param.max != 0 ? param.max : 1e6;
            let ts = outSizes[i];
            if (ts < max && (round >= 2 || round === 0 && param.priority > 0 || round === 1 && (param == defParam || param.ratio === 0 && param.priority >= 0))) {
              limit[i] = max;
              lineSize32 += ts;
              k++;
            } else
              limit[i] = null;
          }
          if (k === 0) {
            round++;
            if (round > 2)
              break;
            else
              continue;
          }
          let ps = dist / k;
          let ps2 = 0;
          for (let i = 0; i < count; i++) {
            let max = limit[i];
            if (max == null)
              continue;
            ps2 += ps;
            k--;
            if (ps2 < 1) {
              if (k != 0)
                continue;
              else
                ps2 = 1;
            }
            let ts = outSizes[i];
            ps2 = Math.floor(ps2);
            ts = Math.min(ts + ps2, max);
            ps2 = ps - ps2;
            dist -= ts - outSizes[i];
            outSizes[i] = ts;
          }
          dist = Math.ceil(dist);
          round++;
        }
      }
    }
    static refreshAllLayouts(caller) {
      let len = _dirtyLayouts.length;
      if (len === 0)
        return;
      if (caller) {
        for (let i = 0; i < len; i++) {
          let layout = _dirtyLayouts[i];
          if (layout && caller.isAncestorOf(layout._owner)) {
            _dirtyLayouts[i] = null;
            layout.refresh();
          }
        }
      } else {
        _timerAdded = false;
        for (let i = 0; i < len; i++) {
          let layout = _dirtyLayouts[i];
          if (layout) {
            _dirtyLayouts[i] = null;
            layout.refresh();
          }
        }
        if (_dirtyLayouts.length > len)
          _dirtyLayouts.splice(0, len);
        else
          _dirtyLayouts.length = 0;
      }
    }
  };
  var _timerAdded = false;
  var _dirtyLayouts = [];
  var TempData = class {
    constructor() {
      this.children = [];
      this.invisibles = [];
      this.invisibleCnt = 0;
      this.stretchParams = [];
      this.posx = [];
      this.posy = [];
      this.width = [];
      this.swidth = [];
      this.height = [];
      this.sheight = [];
    }
  };
  var tempDataPool = new Pool(TempData);
  var limit = [];
  var s_rect3 = new Rect();
  var defParam = new StretchParam();

  // src/ui/Box.ts
  var Box = class extends Widget {
    constructor(layoutClass) {
      super();
      this._layout = new (layoutClass || Layout)(this);
    }
    get layout() {
      return this._layout;
    }
    get background() {
      return this._graphics;
    }
    set background(value) {
      this._setGraphics(value);
    }
    setLayoutChangedFlag(reason) {
      this._layout?.setChangedFlag(reason);
    }
    _sizeChanged(changeByLayout) {
      if (changeByLayout)
        this._layout.refresh();
    }
  };

  // src/ui/Panel.ts
  var Panel = class extends Box {
    constructor(layoutClass, selectionClass) {
      super(layoutClass);
      this._selection = new (selectionClass || Selection)(this);
      this.clipping = true;
    }
    createElement() {
      super.createElement();
      this._container = UIElement.create();
      this._element.appendChild(this._container);
    }
    get scroller() {
      return this._scroller;
    }
    set scroller(value) {
      if (this._scroller)
        this._scroller.owner = null;
      this._scroller = value;
      if (value)
        value.owner = this;
    }
    get selection() {
      return this._selection;
    }
    get selectionMode() {
      return this._selection.mode;
    }
    set selectionMode(value) {
      this._selection.mode = value;
    }
    get selectedIndex() {
      return this._selection.index;
    }
    set selectedIndex(value) {
      this._selection.index = value;
    }
    get clipping() {
      return this._clipping;
    }
    set clipping(value) {
      if (this._clipping != value) {
        this._clipping = value;
        this._processClipping();
      }
    }
    _processClipping() {
      this._element.clipping = this._clipping && !this._getBit(NodeFlags.DISABLE_CLIPPING);
      if (this._scroller)
        this._scroller._processClipping();
    }
    get viewWidth() {
      return this._layout.viewWidth;
    }
    set viewWidth(value) {
      this._layout.viewWidth = value;
    }
    get viewHeight() {
      return this._layout.viewHeight;
    }
    set viewHeight(value) {
      this._layout.viewHeight = value;
    }
    get touchItem() {
      let obj = this.findRoot().inputMgr.touchTarget;
      if (!obj)
        return null;
      let p = obj.parent;
      while (p != null) {
        if (p == this) {
          if (obj.element.parentElement == this._container)
            return obj;
          else
            return null;
        }
        obj = p;
        p = p.parent;
      }
      return null;
    }
    _sizeChanged(changeByLayout) {
      if (this._scroller)
        this._scroller._ownerSizeChanged();
      if (changeByLayout)
        this._layout.refresh();
    }
    /** @internal */
    _prepareActiveChangeList(active, out) {
      super._prepareActiveChangeList(active, out);
      if (this._scroller)
        this._scroller._prepareActiveChangeList(active, out);
    }
    destroy() {
      if (this._scroller)
        this._scroller.destroy();
      super.destroy();
    }
  };

  // src/ui/Tree.ts
  var Tree = class extends Panel {
    constructor() {
      super(null, TreeSelection);
      this.scrollToViewOnExpand = false;
      this.indent = 15;
      this.layout.type = 1 /* SingleColumn */;
      this.selection.mode = 1 /* Single */;
      this._pool = new WidgetPool();
      this.rootNode = new TreeNode(true);
      this.rootNode._setTree(this);
      this.rootNode.expanded = true;
    }
    get selection() {
      return this._selection;
    }
    get clickToExpand() {
      return this._selection.clickToExpand;
    }
    set clickToExpand(value) {
      this._selection.clickToExpand = value;
    }
    get itemTemplate() {
      return this._pool.defaultRes;
    }
    set itemTemplate(value) {
      this._pool.defaultRes = value;
    }
    get itemPool() {
      return this._pool;
    }
    expandAll(folderNode) {
      if (!folderNode)
        folderNode = this.rootNode;
      folderNode.expanded = true;
      let cnt = folderNode.numChildren;
      for (let i = 0; i < cnt; i++) {
        let node = folderNode.getChildAt(i);
        if (node.isFolder)
          this.expandAll(node);
      }
    }
    collapseAll(folderNode) {
      if (!folderNode)
        folderNode = this.rootNode;
      if (folderNode != this.rootNode)
        folderNode.expanded = false;
      let cnt = folderNode.numChildren;
      for (let i = 0; i < cnt; i++) {
        let node = folderNode.getChildAt(i);
        if (node.isFolder)
          this.collapseAll(node);
      }
    }
    /** @internal */
    _afterInserted(node) {
      if (!node.cell)
        node.createCell();
      let index = this.getInsertIndexForNode(node);
      this.addChildAt(node.cell, index);
      if (this.treeNodeRender)
        this.treeNodeRender(node, node.cell);
      if (node.isFolder && node.expanded)
        this.checkChildren(node, index);
    }
    getInsertIndexForNode(node) {
      let prevNode = node.getPrevSibling();
      if (prevNode == null)
        prevNode = node.parent;
      let insertIndex = this.getChildIndex(prevNode.cell) + 1;
      let myLevel = node.level;
      let cnt = this.numChildren;
      for (let i = insertIndex; i < cnt; i++) {
        let testNode = this.getChildAt(i).treeNode;
        if (testNode && testNode.level <= myLevel)
          break;
        insertIndex++;
      }
      return insertIndex;
    }
    /** @internal */
    _afterRemoved(node) {
      this.removeNode(node);
    }
    /** @internal */
    _afterExpanded(node, byEvent) {
      if (node == this.rootNode) {
        this.checkChildren(this.rootNode, 0);
        return;
      }
      if (this.treeNodeWillExpand)
        this.treeNodeWillExpand(node, true);
      if (node.onExpanded)
        node.onExpanded(true);
      if (node.cell == null)
        return;
      if (this.treeNodeRender)
        this.treeNodeRender(node, node.cell);
      if (node.cell.parent) {
        this.checkChildren(node, this.getChildIndex(node.cell));
        if (this.scrollToViewOnExpand && this.scroller != null) {
          let scrollTo = node.getLastVisibleDecendant();
          if (scrollTo == null && node.cell.visible)
            scrollTo = node;
          if (scrollTo)
            this.scroller.scrollTo(scrollTo.cell, false, node.cell);
        }
      }
    }
    /** @internal */
    _afterCollapsed(node, byEvent) {
      if (node == this.rootNode) {
        this.checkChildren(this.rootNode, 0);
        return;
      }
      if (this.treeNodeWillExpand)
        this.treeNodeWillExpand(node, false);
      if (node.onExpanded)
        node.onExpanded(false);
      if (node.cell == null)
        return;
      if (this.treeNodeRender)
        this.treeNodeRender(node, node.cell);
      if (node.cell.parent)
        this.hideFolderNode(node);
    }
    /** @internal */
    _afterMoved(node) {
      let startIndex = this.getChildIndex(node.cell);
      let endIndex;
      if (node.isFolder)
        endIndex = this.getFolderEndIndex(startIndex, node.level);
      else
        endIndex = startIndex + 1;
      let insertIndex = this.getInsertIndexForNode(node);
      if (startIndex == insertIndex || startIndex == insertIndex - 1)
        return;
      let cnt = endIndex - startIndex;
      if (insertIndex < startIndex) {
        for (let i = 0; i < cnt; i++) {
          let obj = this.getChildAt(startIndex + i);
          this._setChildIndex(obj, startIndex + i, insertIndex + i);
        }
      } else {
        for (let i = 0; i < cnt; i++) {
          let obj = this.getChildAt(startIndex);
          this._setChildIndex(obj, startIndex, insertIndex - 1);
        }
      }
    }
    getFolderEndIndex(startIndex, level) {
      let cnt = this.numChildren;
      for (let i = startIndex + 1; i < cnt; i++) {
        let node = this.getChildAt(i).treeNode;
        if (node.level <= level)
          return i;
      }
      return cnt;
    }
    checkChildren(folderNode, index) {
      let cnt = folderNode.numChildren;
      for (let i = 0; i < cnt; i++) {
        index++;
        let node = folderNode.getChildAt(i);
        if (node.cell == null)
          node.createCell();
        if (!node.cell.parent) {
          this.addChildAt(node.cell, index);
          if (this.treeNodeRender)
            this.treeNodeRender(node, node.cell);
        }
        if (node.isFolder && node.expanded)
          index = this.checkChildren(node, index);
      }
      return index;
    }
    hideFolderNode(folderNode) {
      let cnt = folderNode.numChildren;
      for (let i = 0; i < cnt; i++) {
        let node = folderNode.getChildAt(i);
        if (node.cell)
          this.removeChild(node.cell);
        if (node.isFolder && node.expanded)
          this.hideFolderNode(node);
      }
    }
    removeNode(node) {
      if (node.cell) {
        node.cell.removeSelf();
        if (node._cellFromPool) {
          this._pool.returnObject(node.cell);
          node.cell = null;
        }
      }
      if (node.isFolder) {
        let cnt = node.numChildren;
        for (let i = 0; i < cnt; i++) {
          let node2 = node.getChildAt(i);
          this.removeNode(node2);
        }
      }
    }
    onAfterDeserialize() {
      super.onAfterDeserialize();
      if (SerializeUtil.hasProp("_initItemNum", "_itemData") && (UIPackage.isPreview || !SerializeUtil._data._isDemo))
        this._buildInitItems();
    }
    /** @internal */
    _buildInitItems() {
      this.rootNode.removeChildren();
      if (this.itemTemplate == null)
        return;
      let itemData = this._itemData;
      let prevLevel = 0;
      let lastNode;
      for (let i = 0; i < this._initItemNum; i++) {
        let m = itemData && i < itemData.length ? itemData[i] : null;
        if (m != null) {
          let level = m.level || 0;
          let isFolder = (itemData[i + 1]?.level || 0) > level;
          let node = new TreeNode(isFolder, m.res?.url);
          node.expanded = true;
          if (i == 0)
            this.rootNode.addChild(node);
          else {
            if (level > prevLevel)
              lastNode.addChild(node);
            else if (level < prevLevel) {
              for (let j = level; j <= prevLevel; j++)
                lastNode = lastNode.parent;
              lastNode.addChild(node);
            } else
              lastNode.parent.addChild(node);
          }
          lastNode = node;
          prevLevel = level;
          let child = node.cell;
          child.text = m.title;
          if (m.icon)
            child.icon = m.icon;
          if (child instanceof Button) {
            if (m.selectedTitle)
              child.selectedTitle = m.selectedTitle;
            if (m.selectedIcon)
              child.selectedIcon = m.selectedIcon;
            child.selected = false;
          }
          if (m.name != null)
            child.name = m.name;
        } else {
          let node = new TreeNode();
          this.rootNode.addChild(node);
          prevLevel = 0;
          lastNode = node;
        }
      }
      this.selection._refresh();
    }
  };

  // src/ui/Slider.ts
  var Slider = class extends Widget {
    constructor() {
      super();
      this.changeOnClick = true;
      this.canDrag = true;
      this._min = 0;
      this._max = 0;
      this._value = 0;
      this._titleType = 0;
      this._reverse = false;
      this._wholeNumbers = false;
      this._barMaxWidthDelta = 0;
      this._barMaxHeightDelta = 0;
      this._clickPercent = 0;
      this._barStartX = 0;
      this._barStartY = 0;
      this._value = 50;
      this._max = 100;
      this._clickPos = new Vec2();
      this.on("pointer_down", this._barTouchBegin, this);
    }
    get titleType() {
      return this._titleType;
    }
    set titleType(value) {
      if (this._titleType != value) {
        this._titleType = value;
        this.update(true);
      }
    }
    get wholeNumbers() {
      return this._wholeNumbers;
    }
    set wholeNumbers(value) {
      if (this._wholeNumbers != value) {
        this._wholeNumbers = value;
        this.update(true);
      }
    }
    get min() {
      return this._min;
    }
    set min(value) {
      if (this._min != value) {
        this._min = value;
        this.update(true);
      }
    }
    get max() {
      return this._max;
    }
    set max(value) {
      if (this._max != value) {
        this._max = value;
        this.update(true);
      }
    }
    get value() {
      return this._value;
    }
    set value(value) {
      if (this._value != value) {
        this._value = value;
        this.update(true);
      }
    }
    get hBar() {
      return this._hBar;
    }
    set hBar(value) {
      this._hBar = value;
      this._value = this._max;
      this._barStartX = 0;
      this.update(false);
    }
    get vBar() {
      return this._vBar;
    }
    set vBar(value) {
      this._vBar = value;
      this._value = this._max;
      this._barStartY = 0;
      this.update(false);
    }
    get gripButton() {
      return this._gripButton;
    }
    set gripButton(value) {
      this.setupEvents(false);
      this._gripButton = value;
      this.setupEvents(true);
    }
    get titleWidget() {
      return this._titleWidget;
    }
    set titleWidget(value) {
      this._titleWidget = value;
      this.update(false);
    }
    get reverse() {
      return this._reverse;
    }
    set reverse(value) {
      this._reverse = value;
      this.update(false);
    }
    update(delay) {
      if (delay === true)
        Timers.callLater(this.update, this);
      else
        this.updateWithPercent((this._value - this._min) / (this._max - this._min), false);
    }
    updateWithPercent(percent, manual) {
      if (this._getBit(NodeFlags.EDITING_ROOT_NODE)) {
        this.updateTitle(this._max, this._max, 1);
        return;
      }
      percent = clamp01(percent);
      if (manual) {
        let newValue = clamp(this._min + (this._max - this._min) * percent, this._min, this._max);
        if (this._wholeNumbers) {
          newValue = Math.round(newValue);
          percent = clamp01((newValue - this._min) / (this._max - this._min));
        }
        if (newValue != this._value) {
          this._value = newValue;
          if (this.emit("changed"))
            return;
        }
      }
      this.updateTitle(this._value, this._max, percent);
      let fullWidth = this.width - this._barMaxWidthDelta;
      let fullHeight = this.height - this._barMaxHeightDelta;
      if (!this._reverse) {
        if (this._hBar)
          this._hBar.width = Math.round(fullWidth * percent);
        if (this._vBar)
          this._vBar.height = Math.round(fullHeight * percent);
      } else {
        if (this._hBar) {
          this._hBar.width = Math.round(fullWidth * percent);
          this._hBar.x = this._barStartX + (fullWidth - this._hBar.width);
        }
        if (this._vBar) {
          this._vBar.height = Math.round(fullHeight * percent);
          this._vBar.y = this._barStartY + (fullHeight - this._vBar.height);
        }
      }
    }
    updateTitle(value, max, percent) {
      let obj = this._titleWidget;
      if (!obj)
        return;
      switch (this._titleType) {
        case 0 /* Percent */:
          obj.text = Math.floor(percent * 100) + "%";
          break;
        case 1 /* ValueAndMax */:
          obj.text = Math.floor(value) + "/" + Math.floor(max);
          break;
        case 2 /* Value */:
          obj.text = "" + Math.floor(value);
          break;
        case 3 /* Max */:
          obj.text = "" + Math.floor(max);
          break;
      }
    }
    /** @internal */
    _onConstruct(inPrefab) {
      if (this._hBar) {
        this._barMaxWidthDelta = this.width - this._hBar.width;
        this._barStartX = this._hBar.x;
      }
      if (this._vBar) {
        this._barMaxHeightDelta = this.height - this._vBar.height;
        this._barStartY = this._vBar.y;
      }
      this.setupEvents(true);
      Timers.runCallLater(this.update, this);
      super._onConstruct(inPrefab);
    }
    setupEvents(add) {
      if (!gui.UIPackage.isPlaying)
        return;
      if (this._gripButton) {
        if (add) {
          this._gripButton.on("pointer_down", this._gripTouchBegin, this);
          this._gripButton.on("pointer_move", this._gripTouchMove, this);
        } else {
          this._gripButton.off("pointer_down", this._gripTouchBegin, this);
          this._gripButton.off("pointer_move", this._gripTouchMove, this);
        }
      }
    }
    _setup(hBar, vBar, grip, title, reverse) {
      this._hBar = hBar;
      this._vBar = vBar;
      this._gripButton = grip;
      this._titleWidget = title;
      this._reverse = reverse;
      this._value = this._max;
      this._onConstruct();
    }
    _sizeChanged() {
      super._sizeChanged();
      this.update(true);
    }
    _gripTouchBegin(evt) {
      if (evt.input.button != 0)
        return;
      evt.stopPropagation();
      evt.capturePointer();
      this.startDragGrip(evt.input.x, evt.input.y);
    }
    startDragGrip(x, y) {
      this.canDrag = true;
      this.globalToLocal(x, y, this._clickPos);
      this._clickPercent = clamp01((this._value - this._min) / (this._max - this._min));
    }
    _gripTouchMove(evt) {
      if (!this.canDrag)
        return;
      let pt = this.globalToLocal(evt.input.x, evt.input.y, s_vec23);
      let deltaX = pt.x - this._clickPos.x;
      let deltaY = pt.y - this._clickPos.y;
      if (this._reverse) {
        deltaX = -deltaX;
        deltaY = -deltaY;
      }
      let percent;
      if (this._hBar)
        percent = this._clickPercent + deltaX / (this.width - this._barMaxWidthDelta);
      else
        percent = this._clickPercent + deltaY / (this.height - this._barMaxHeightDelta);
      this.updateWithPercent(percent, true);
    }
    _barTouchBegin(evt) {
      if (!this.changeOnClick)
        return;
      let pt = this._gripButton.globalToLocal(evt.input.x, evt.input.y, s_vec23);
      let percent = clamp01((this._value - this._min) / (this._max - this._min));
      let delta = 0;
      if (this._hBar)
        delta = (pt.x - this._gripButton.width / 2) / (this.width - this._barMaxWidthDelta);
      if (this._vBar)
        delta = (pt.y - this._gripButton.height / 2) / (this.height - this._barMaxHeightDelta);
      if (this._reverse)
        percent -= delta;
      else
        percent += delta;
      this.updateWithPercent(percent, true);
      this.findRoot().inputMgr.addCaptor(-1, this._gripButton);
      this.startDragGrip(evt.input.x, evt.input.y);
    }
    onAfterDeserialize() {
      if (SerializeUtil.hasProp("_gripButton"))
        this.setupEvents(true);
    }
  };
  var s_vec23 = new Vec2();

  // src/ui/layout/ListLayout.ts
  var ListLayout = class extends Layout {
    constructor() {
      super(...arguments);
      this._lineItemCnt = 0;
      this._numItems = 0;
      this._itemSize = new Vec2();
      this._firstIndex = 0;
      //the top left index
      this._changed = 0;
      this._itemInfoVer = 0;
    }
    get numItems() {
      if (this._virtual)
        return this._numItems;
      else
        return this._owner.children.length;
    }
    set numItems(value) {
      if (this._virtual) {
        if (this._owner.itemRenderer == null)
          throw new Error("set itemRenderer first!");
        this._numItems = value;
        if (this._loop)
          this._realNumItems = this._numItems * 6;
        else
          this._realNumItems = this._numItems;
        let oldCount = this._items.length;
        if (this._realNumItems > oldCount) {
          for (let i = oldCount; i < this._realNumItems; i++) {
            let ii = { width: 0, height: 0, flag: 0 };
            ii.width = this._itemSize.x;
            ii.height = this._itemSize.y;
            this._items.push(ii);
          }
        } else {
          for (let i = this._realNumItems; i < oldCount; i++)
            this._items[i].selected = false;
        }
        if (this._changed != 0)
          Timers.remove(this._refreshVirtualList, this);
        this._refreshVirtualList();
      } else {
        let cnt = this._owner.children.length;
        if (value > cnt) {
          for (let i = cnt; i < value; i++) {
            if (this._owner.itemProvider)
              this._owner.addItemFromPool(this._owner.itemProvider(i));
            else
              this._owner.addItemFromPool();
          }
        } else {
          this._owner.removeChildrenToPool(value, cnt);
        }
        if (this._owner.itemRenderer) {
          for (let i = 0; i < value; i++)
            this._owner.itemRenderer(i, this._owner.getChildAt(i));
        }
      }
    }
    get itemSize() {
      return this._itemSize;
    }
    set itemSize(value) {
      this._itemSize.set(value.x, value.y);
      if (this._virtual) {
        if (this._type === 1 /* SingleColumn */ || this._type === 3 /* FlowX */)
          this._owner.scroller.step = this._itemSize.y;
        else
          this._owner.scroller.step = this._itemSize.x;
        this._changed = 2;
        Timers.callLater(this._refreshVirtualList, this);
      }
    }
    /** @internal */
    _setVirtual(loop) {
      if (this._virtual)
        return;
      this._virtual = true;
      this._loop = loop;
      this._items = [];
      this._itemSizes = [];
      this._owner.removeChildrenToPool();
      if (this._itemSize.x === 0 && this._itemSize.y === 0) {
        let obj = this._owner.getFromPool();
        if (obj == null) {
          throw new Error("Virtual List must have a default list item resource.");
        } else {
          this._itemSize.x = obj.width;
          this._itemSize.y = obj.height;
        }
        this._owner.returnToPool(obj);
      }
      if (this._type === 1 /* SingleColumn */ || this._type === 3 /* FlowX */) {
        this._owner.scroller.step = this._itemSize.y;
        if (this._loop)
          this._owner.scroller._loop = 2;
      } else {
        this._owner.scroller.step = this._itemSize.x;
        if (this._loop)
          this._owner.scroller._loop = 1;
      }
      this._owner.on("scroll", this._scrolled, this);
      this._changed = 2;
      Timers.callLater(this._refreshVirtualList, this);
    }
    childIndexToItemIndex(index) {
      if (!this._virtual)
        return index;
      if (this._pageMode) {
        for (let i = this._firstIndex; i < this._realNumItems; i++) {
          if (this._items[i].obj) {
            index--;
            if (index < 0)
              return i;
          }
        }
        return index;
      } else {
        index += this._firstIndex;
        if (this._loop && this._numItems > 0)
          index = index % this._numItems;
        return index;
      }
    }
    itemIndexToChildIndex(index) {
      if (!this._virtual)
        return index;
      if (this._pageMode) {
        return this._owner.getChildIndex(this._items[index].obj);
      } else {
        if (this._loop && this._numItems > 0) {
          let j = this._firstIndex % this._numItems;
          if (index >= j)
            index = index - j;
          else
            index = this._numItems - j + index;
        } else
          index -= this._firstIndex;
        return index;
      }
    }
    shouldSnapToNext(dir, delta, size) {
      return dir < 0 && delta > UIConfig.defaultScrollSnappingThreshold * size || dir > 0 && delta > (1 - UIConfig.defaultScrollSnappingThreshold) * size || dir === 0 && delta > size / 2;
    }
    getSnappingPosition(xValue, yValue, xDir, yDir, resultPoint) {
      if (this._virtual) {
        if (!resultPoint)
          resultPoint = new Vec2();
        if (this._type === 1 /* SingleColumn */ || (this._pageMode ? this._type === 4 /* FlowY */ : this._type === 3 /* FlowX */)) {
          let saved = yValue;
          s_n = yValue;
          let index = this.getIndexOnPos1(false);
          yValue = s_n;
          if (index < this._items.length && index < this._realNumItems) {
            let size = this._items[index].height;
            if (this.shouldSnapToNext(yDir, saved - yValue, size))
              yValue += size + this._rowGap;
          }
        } else {
          let saved = xValue;
          s_n = xValue;
          let index = this.getIndexOnPos2(false);
          xValue = s_n;
          if (index < this._items.length && index < this._realNumItems) {
            let size = this._items[index].width;
            if (this.shouldSnapToNext(xDir, saved - xValue, size))
              xValue += size + this._columnGap;
          }
        }
        resultPoint.x = xValue;
        resultPoint.y = yValue;
        return resultPoint;
      } else
        return super.getSnappingPosition(xValue, yValue, xDir, yDir, resultPoint);
    }
    getRectByItemIndex(index) {
      if (!this._virtual || this._numItems === 0)
        return new Rect();
      this._checkVirtualList();
      if (index >= this._items.length)
        throw new Error("Invalid child index: " + index + ">" + this._items.length);
      if (this._loop)
        index = Math.floor(this._firstIndex / this._numItems) * this._numItems + index;
      let rect;
      let ii = this._items[index];
      let pos = 0;
      if (this._type === 1 /* SingleColumn */ || this._type === 3 /* FlowX */) {
        for (let i = this._lineItemCnt - 1; i < index; i += this._lineItemCnt)
          pos += this._items[i].height + this._rowGap;
        rect = new Rect(0, pos, this._itemSize.x, ii.height);
      } else {
        for (let i = this._lineItemCnt - 1; i < index; i += this._lineItemCnt)
          pos += this._items[i].width + this._columnGap;
        rect = new Rect(pos, 0, ii.width, this._itemSize.y);
      }
      return rect;
    }
    setChangedFlag(reason) {
      super.setChangedFlag(reason);
      if (this._layoutChanged && reason == null && this._virtual) {
        this._changed = 2;
        Timers.callLater(this._refreshVirtualList, this);
      }
    }
    refresh(force) {
      if (!this._virtual)
        super.refresh(force);
    }
    /** @internal */
    _checkVirtualList() {
      if (this._changed != 0) {
        this._refreshVirtualList();
        Timers.remove(this._refreshVirtualList, this);
      }
    }
    refreshVirtualList() {
      if (this._changed === 0)
        this._changed = 1;
      Timers.callLater(this._refreshVirtualList, this);
    }
    getColumns() {
      if (this._columns > 0)
        return this._columns;
      else
        return Math.max(1, Math.floor((this.viewWidth + this._columnGap) / (this._itemSize.x + this._columnGap)));
    }
    getRows() {
      if (this._rows > 0)
        return this._rows;
      else
        return Math.max(1, Math.floor((this.viewHeight + this._rowGap) / (this._itemSize.y + this._rowGap)));
    }
    _refreshVirtualList() {
      if (this._owner.destroyed)
        return;
      let layoutChanged = this._changed === 2;
      this._changed = 0;
      this._eventLocked = true;
      let vw = this.viewWidth;
      let vh = this.viewHeight;
      if (layoutChanged) {
        this._lineItemCnt = 1;
        this._lineItemCnt2 = 1;
        if (this._type === 3 /* FlowX */) {
          this._lineItemCnt = this.getColumns();
          if (this._pageMode)
            this._lineItemCnt2 = this.getRows();
        } else if (this._type === 4 /* FlowY */) {
          this._lineItemCnt = this.getRows();
          if (this._pageMode)
            this._lineItemCnt2 = this.getColumns();
        }
        this._itemSizes.length = 0;
        if (this._type === 1 /* SingleColumn */ || this._type === 3 /* FlowX */) {
          if (this._stretchX === 1 /* Stretch */) {
            for (let i = 0; i < this._lineItemCnt; i++)
              this._itemSizes[i] = this._itemSize.x;
            this.handleStrecth(vw, this._lineItemCnt, this._columnGap, this.stretchParamsX, this._itemSizes);
          }
        } else {
          if (this._stretchY === 1 /* Stretch */) {
            for (let i = 0; i < this._lineItemCnt; i++)
              this._itemSizes[i] = this._itemSize.y;
            this.handleStrecth(vh, this._lineItemCnt, this._rowGap, this.stretchParamsY, this._itemSizes);
          }
        }
      }
      let ch = 0, cw = 0;
      if (this._realNumItems > 0) {
        let len = Math.ceil(this._realNumItems / this._lineItemCnt) * this._lineItemCnt;
        let len2 = Math.min(this._lineItemCnt, this._realNumItems);
        if (this._pageMode) {
          let pageCount = Math.ceil(len / (this._lineItemCnt * this._lineItemCnt2));
          if (this._type === 2 /* SingleRow */ || this._type === 3 /* FlowX */) {
            cw = pageCount * vw;
            ch = vh;
          } else {
            cw = vw;
            ch = pageCount * vh;
          }
        } else if (this._type === 1 /* SingleColumn */ || this._type === 3 /* FlowX */) {
          for (let i = 0; i < len; i += this._lineItemCnt)
            ch += this._items[i].height + this._rowGap;
          if (ch > 0)
            ch -= this._rowGap;
          if (this._stretchX === 1 /* Stretch */)
            cw = vw;
          else {
            for (let i = 0; i < len2; i++)
              cw += this._items[i].width + this._columnGap;
            if (cw > 0)
              cw -= this._columnGap;
          }
        } else {
          for (let i = 0; i < len; i += this._lineItemCnt)
            cw += this._items[i].width + this._columnGap;
          if (cw > 0)
            cw -= this._columnGap;
          if (this._stretchY === 1 /* Stretch */)
            ch = vh;
          else {
            for (let i = 0; i < len2; i++)
              ch += this._items[i].height + this._rowGap;
            if (ch > 0)
              ch -= this._rowGap;
          }
        }
        this._offsetX = 0;
        this._offsetY = 0;
        if (cw < vw) {
          if (this._align === 1)
            this._offsetX = Math.floor((vw - cw) / 2);
          else if (this._align === 2)
            this._offsetX = vw - cw;
          if (!this._owner.scroller)
            this._offsetX += this._padding[3];
        }
        if (ch < vh) {
          if (this._valign === 1)
            this._offsetY = Math.floor((vh - ch) / 2);
          else if (this._valign === 2)
            this._offsetY = vh - ch;
          if (!this._owner.scroller)
            this._offsetY += this._padding[0];
        }
      }
      this.setContentSize(cw, ch);
      this._eventLocked = false;
      this.handleScroll(true);
    }
    _scrolled() {
      this.handleScroll(false);
    }
    getIndexOnPos1(forceUpdate) {
      if (this._realNumItems < this._lineItemCnt) {
        s_n = 0;
        return 0;
      }
      if (this._owner.numChildren > 0 && !forceUpdate) {
        let pos2 = this._owner.getChildAt(0).top;
        if (pos2 > s_n) {
          for (let i = this._firstIndex - this._lineItemCnt; i >= 0; i -= this._lineItemCnt) {
            pos2 -= this._items[i].height + this._rowGap;
            if (pos2 <= s_n) {
              s_n = pos2;
              return i;
            }
          }
          s_n = 0;
          return 0;
        } else {
          for (let i = this._firstIndex; i < this._realNumItems; i += this._lineItemCnt) {
            let pos3 = pos2 + this._items[i].height + this._rowGap;
            if (pos3 > s_n) {
              s_n = pos2;
              return i;
            }
            pos2 = pos3;
          }
          s_n = pos2;
          return this._realNumItems - this._lineItemCnt;
        }
      } else {
        let pos2 = 0;
        for (let i = 0; i < this._realNumItems; i += this._lineItemCnt) {
          let pos3 = pos2 + this._items[i].height + this._rowGap;
          if (pos3 > s_n) {
            s_n = pos2;
            return i;
          }
          pos2 = pos3;
        }
        s_n = pos2;
        return this._realNumItems - this._lineItemCnt;
      }
    }
    getIndexOnPos2(forceUpdate) {
      if (this._realNumItems < this._lineItemCnt) {
        s_n = 0;
        return 0;
      }
      if (this._owner.numChildren > 0 && !forceUpdate) {
        let pos2 = this._owner.getChildAt(0).left;
        if (pos2 > s_n) {
          for (let i = this._firstIndex - this._lineItemCnt; i >= 0; i -= this._lineItemCnt) {
            pos2 -= this._items[i].width + this._columnGap;
            if (pos2 <= s_n) {
              s_n = pos2;
              return i;
            }
          }
          s_n = 0;
          return 0;
        } else {
          for (let i = this._firstIndex; i < this._realNumItems; i += this._lineItemCnt) {
            let pos3 = pos2 + this._items[i].width + this._columnGap;
            if (pos3 > s_n) {
              s_n = pos2;
              return i;
            }
            pos2 = pos3;
          }
          s_n = pos2;
          return this._realNumItems - this._lineItemCnt;
        }
      } else {
        let pos2 = 0;
        for (let i = 0; i < this._realNumItems; i += this._lineItemCnt) {
          let pos3 = pos2 + this._items[i].width + this._columnGap;
          if (pos3 > s_n) {
            s_n = pos2;
            return i;
          }
          pos2 = pos3;
        }
        s_n = pos2;
        return this._realNumItems - this._lineItemCnt;
      }
    }
    getIndexOnPos3(forceUpdate) {
      if (this._realNumItems < this._lineItemCnt) {
        s_n = 0;
        return 0;
      }
      let vw = this.viewWidth;
      let page = Math.floor(s_n / vw);
      let startIndex = page * (this._lineItemCnt * this._lineItemCnt2);
      let pos2 = page * vw;
      for (let i = 0; i < this._lineItemCnt; i++) {
        let pos3 = pos2 + this._items[startIndex + i].width + this._columnGap;
        if (pos3 > s_n) {
          s_n = pos2;
          return startIndex + i;
        }
        pos2 = pos3;
      }
      s_n = pos2;
      return startIndex + this._lineItemCnt - 1;
    }
    getIndexOnPos4(forceUpdate) {
      if (this._realNumItems < this._lineItemCnt) {
        s_n = 0;
        return 0;
      }
      let vh = this.viewHeight;
      let page = Math.floor(s_n / vh);
      let startIndex = page * (this._lineItemCnt * this._lineItemCnt2);
      let pos2 = page * vh;
      for (let i = 0; i < this._lineItemCnt; i++) {
        let pos3 = pos2 + this._items[startIndex + i].height + this._rowGap;
        if (pos3 > s_n) {
          s_n = pos2;
          return startIndex + i;
        }
        pos2 = pos3;
      }
      s_n = pos2;
      return startIndex + this._lineItemCnt - 1;
    }
    handleScroll(forceUpdate) {
      if (this._eventLocked)
        return;
      if (this._pageMode) {
        if (this._type === 2 /* SingleRow */ || this._type === 3 /* FlowX */)
          this.handleScroll3(forceUpdate);
        else
          this.handleScroll4(forceUpdate);
      } else if (this._type === 1 /* SingleColumn */ || this._type === 3 /* FlowX */) {
        let enterCounter = 0;
        while (this.handleScroll1(forceUpdate)) {
          enterCounter++;
          forceUpdate = false;
          if (enterCounter > 20) {
            console.log("list will never be <the> filled item renderer function always returns a different size.");
            break;
          }
        }
      } else {
        let enterCounter = 0;
        while (this.handleScroll2(forceUpdate)) {
          enterCounter++;
          forceUpdate = false;
          if (enterCounter > 20) {
            console.log("list will never be <the> filled item renderer function always returns a different size.");
            break;
          }
        }
      }
      this._layoutChanged = false;
    }
    handleScroll1(forceUpdate) {
      let scroller = this._owner.scroller;
      let pos = scroller.scrollingPosY;
      let max = pos + scroller.viewHeight;
      let end = max === scroller.contentHeight;
      s_n = pos;
      let newFirstIndex = this.getIndexOnPos1(forceUpdate);
      pos = s_n;
      if (newFirstIndex === this._firstIndex && !forceUpdate)
        return false;
      let oldFirstIndex = this._firstIndex;
      this._firstIndex = newFirstIndex;
      let curIndex = newFirstIndex;
      let forward = oldFirstIndex > newFirstIndex;
      let childCount = this._owner.numChildren;
      let lastIndex = oldFirstIndex + childCount - 1;
      let reuseIndex = forward ? lastIndex : oldFirstIndex;
      let curX = 0, curY = pos;
      let needRender;
      let deltaSize = 0;
      let firstItemDeltaSize = 0;
      let pool = this._owner.itemPool;
      let url = pool.defaultRes.url;
      this._itemInfoVer++;
      while (curIndex < this._realNumItems && (end || curY < max)) {
        let ii = this._items[curIndex];
        if (ii.obj == null || forceUpdate) {
          if (this._owner.itemProvider) {
            url = this._owner.itemProvider(curIndex % this._numItems);
            if (!url)
              url = pool.defaultRes.url;
          }
          if (ii.obj && ii.obj.prefabUrl != url) {
            if (ii.obj instanceof Button)
              ii.selected = ii.obj.selected;
            this._owner.removeChildToPool(ii.obj);
            ii.obj = null;
          }
        }
        if (ii.obj == null) {
          if (forward) {
            for (let j = reuseIndex; j >= oldFirstIndex; j--) {
              let ii2 = this._items[j];
              if (ii2.obj && ii2.flag != this._itemInfoVer && ii2.obj.prefabUrl == url) {
                if (ii2.obj instanceof Button)
                  ii2.selected = ii2.obj.selected;
                ii.obj = ii2.obj;
                ii2.obj = null;
                if (j === reuseIndex)
                  reuseIndex--;
                break;
              }
            }
          } else {
            for (let j = reuseIndex; j <= lastIndex; j++) {
              let ii2 = this._items[j];
              if (ii2.obj && ii2.flag != this._itemInfoVer && ii2.obj.prefabUrl == url) {
                if (ii2.obj instanceof Button)
                  ii2.selected = ii2.obj.selected;
                ii.obj = ii2.obj;
                ii2.obj = null;
                if (j === reuseIndex)
                  reuseIndex++;
                break;
              }
            }
          }
          if (ii.obj) {
            this._owner.setChildIndex(ii.obj, forward ? curIndex - newFirstIndex : this._owner.numChildren);
          } else {
            ii.obj = pool.getObject(url);
            if (forward)
              this._owner.addChildAt(ii.obj, curIndex - newFirstIndex);
            else
              this._owner.addChild(ii.obj);
          }
          if (ii.obj instanceof Button)
            ii.obj.selected = ii.selected;
          needRender = true;
        } else
          needRender = forceUpdate;
        if (needRender) {
          let k = curIndex % this._lineItemCnt;
          if (this._stretchX === 1 /* Stretch */)
            ii.obj.setSize(this._itemSizes[k], ii.obj.height);
          this._owner.itemRenderer(curIndex % this._numItems, ii.obj);
          Layout.refreshAllLayouts(this._owner);
          if (k === 0) {
            deltaSize += Math.ceil(ii.obj.height) - ii.height;
            if (curIndex === newFirstIndex && oldFirstIndex > newFirstIndex) {
              firstItemDeltaSize = Math.ceil(ii.obj.height) - ii.height;
            }
          }
          ii.width = Math.ceil(ii.obj.width);
          ii.height = Math.ceil(ii.obj.height);
        }
        ii.flag = this._itemInfoVer;
        ii.obj.setLeftTop(this._offsetX + curX, curY);
        if (curIndex === newFirstIndex)
          max += ii.height;
        curX += ii.width + this._columnGap;
        if (curIndex % this._lineItemCnt === this._lineItemCnt - 1) {
          curX = 0;
          curY += ii.height + this._rowGap;
        }
        curIndex++;
      }
      for (let i = 0; i < childCount; i++) {
        let ii = this._items[oldFirstIndex + i];
        if (ii.flag != this._itemInfoVer && ii.obj) {
          if (ii.obj instanceof Button)
            ii.selected = ii.obj.selected;
          this._owner.removeChildToPool(ii.obj);
          ii.obj = null;
        }
      }
      childCount = this._owner.children.length;
      let maxWidth = 0;
      for (let i = 0; i < childCount; i++) {
        let obj = this._items[newFirstIndex + i].obj;
        if (this._owner.children[i] != obj)
          this._owner.setChildIndex(obj, i);
        let w = obj.width;
        if (w > maxWidth)
          maxWidth = w;
      }
      let deltaWidth = 0;
      let checkOverflow;
      if (this._type === 1 /* SingleColumn */ && (checkOverflow = scroller._shouldCheckOverflow()) != 0) {
        let resize;
        if ((checkOverflow & 2) != 0) {
          deltaWidth = maxWidth - scroller.contentWidth;
          resize = Math.abs(deltaWidth) >= 1;
        }
        if ((checkOverflow & 1) != 0 && scroller.contentHeight < scroller.viewHeight && maxWidth <= scroller.viewWidth) {
          maxWidth = scroller.viewWidth + scroller.vScrollBar.width;
          resize = true;
        }
        if (resize) {
          for (let i = 0; i < childCount; i++) {
            let obj = this._owner.children[i];
            obj.width = maxWidth;
          }
        }
      }
      if (deltaWidth != 0 || deltaSize != 0 || firstItemDeltaSize != 0)
        scroller._changeContentSizeOnScrolling(deltaWidth, deltaSize, 0, firstItemDeltaSize);
      if (curIndex > 0 && this._owner.numChildren > 0 && this._owner.container.y <= 0 && this._owner.getChildAt(0).top > -this._owner.container.y)
        return true;
      else
        return false;
    }
    handleScroll2(forceUpdate) {
      let pos = this._owner.scroller.scrollingPosX;
      let max = pos + this._owner.scroller.viewWidth;
      let end = max === this._owner.scroller.contentWidth;
      s_n = pos;
      let newFirstIndex = this.getIndexOnPos2(forceUpdate);
      pos = s_n;
      if (newFirstIndex === this._firstIndex && !forceUpdate)
        return false;
      let oldFirstIndex = this._firstIndex;
      this._firstIndex = newFirstIndex;
      let curIndex = newFirstIndex;
      let forward = oldFirstIndex > newFirstIndex;
      let childCount = this._owner.numChildren;
      let lastIndex = oldFirstIndex + childCount - 1;
      let reuseIndex = forward ? lastIndex : oldFirstIndex;
      let curX = pos, curY = 0;
      let needRender;
      let deltaSize = 0;
      let firstItemDeltaSize = 0;
      let pool = this._owner.itemPool;
      let url = pool.defaultRes.url;
      this._itemInfoVer++;
      while (curIndex < this._realNumItems && (end || curX < max)) {
        let ii = this._items[curIndex];
        if (ii.obj == null || forceUpdate) {
          if (this._owner.itemProvider) {
            url = this._owner.itemProvider(curIndex % this._numItems);
            if (!url)
              url = pool.defaultRes.url;
          }
          if (ii.obj && ii.obj.prefabUrl != url) {
            if (ii.obj instanceof Button)
              ii.selected = ii.obj.selected;
            this._owner.removeChildToPool(ii.obj);
            ii.obj = null;
          }
        }
        if (ii.obj == null) {
          if (forward) {
            for (let j = reuseIndex; j >= oldFirstIndex; j--) {
              let ii2 = this._items[j];
              if (ii2.obj && ii2.flag != this._itemInfoVer && ii2.obj.prefabUrl == url) {
                if (ii2.obj instanceof Button)
                  ii2.selected = ii2.obj.selected;
                ii.obj = ii2.obj;
                ii2.obj = null;
                if (j === reuseIndex)
                  reuseIndex--;
                break;
              }
            }
          } else {
            for (let j = reuseIndex; j <= lastIndex; j++) {
              let ii2 = this._items[j];
              if (ii2.obj && ii2.flag != this._itemInfoVer && ii2.obj.prefabUrl == url) {
                if (ii2.obj instanceof Button)
                  ii2.selected = ii2.obj.selected;
                ii.obj = ii2.obj;
                ii2.obj = null;
                if (j === reuseIndex)
                  reuseIndex++;
                break;
              }
            }
          }
          if (ii.obj) {
            this._owner.setChildIndex(ii.obj, forward ? curIndex - newFirstIndex : this._owner.numChildren);
          } else {
            ii.obj = pool.getObject(url);
            if (forward)
              this._owner.addChildAt(ii.obj, curIndex - newFirstIndex);
            else
              this._owner.addChild(ii.obj);
          }
          if (ii.obj instanceof Button)
            ii.obj.selected = ii.selected;
          needRender = true;
        } else
          needRender = forceUpdate;
        if (needRender) {
          let k = curIndex % this._lineItemCnt;
          if (this._stretchY === 1 /* Stretch */)
            ii.obj.setSize(ii.obj.width, this._itemSizes[k]);
          this._owner.itemRenderer(curIndex % this._numItems, ii.obj);
          Layout.refreshAllLayouts(this._owner);
          if (k === 0) {
            deltaSize += Math.ceil(ii.obj.width) - ii.width;
            if (curIndex === newFirstIndex && oldFirstIndex > newFirstIndex) {
              firstItemDeltaSize = Math.ceil(ii.obj.width) - ii.width;
            }
          }
          ii.width = Math.ceil(ii.obj.width);
          ii.height = Math.ceil(ii.obj.height);
        }
        ii.flag = this._itemInfoVer;
        ii.obj.setLeftTop(curX, this._offsetY + curY);
        if (curIndex === newFirstIndex)
          max += ii.width;
        curY += ii.height + this._rowGap;
        if (curIndex % this._lineItemCnt === this._lineItemCnt - 1) {
          curY = 0;
          curX += ii.width + this._columnGap;
        }
        curIndex++;
      }
      for (let i = 0; i < childCount; i++) {
        let ii = this._items[oldFirstIndex + i];
        if (ii.flag != this._itemInfoVer && ii.obj) {
          if (ii.obj instanceof Button)
            ii.selected = ii.obj.selected;
          this._owner.removeChildToPool(ii.obj);
          ii.obj = null;
        }
      }
      childCount = this._owner.numChildren;
      for (let i = 0; i < childCount; i++) {
        let obj = this._items[newFirstIndex + i].obj;
        if (this._owner.children[i] != obj)
          this._owner.setChildIndex(obj, i);
      }
      if (deltaSize != 0 || firstItemDeltaSize != 0)
        this._owner.scroller._changeContentSizeOnScrolling(deltaSize, 0, firstItemDeltaSize, 0);
      if (curIndex > 0 && this._owner.numChildren > 0 && this._owner.container.x <= 0 && this._owner.getChildAt(0).left > -this._owner.container.x)
        return true;
      else
        return false;
    }
    handleScroll3(forceUpdate) {
      let pos = this._owner.scroller.scrollingPosX;
      s_n = pos;
      let newFirstIndex = this.getIndexOnPos3(forceUpdate);
      pos = s_n;
      if (newFirstIndex === this._firstIndex && !forceUpdate)
        return;
      let oldFirstIndex = this._firstIndex;
      this._firstIndex = newFirstIndex;
      let reuseIndex = oldFirstIndex;
      let virtualItemCount = this._items.length;
      let pageSize = this._lineItemCnt * this._lineItemCnt2;
      let startCol = newFirstIndex % this._lineItemCnt;
      let vw = this.viewWidth;
      let vh = this.viewHeight;
      let page = Math.floor(newFirstIndex / pageSize);
      let startIndex = page * pageSize;
      let lastIndex = startIndex + pageSize * 2;
      let needRender;
      let partWidth, partHeight;
      if (this._stretchX === 1 /* Stretch */ || this._stretchY === 1 /* Stretch */) {
        if (this._lineItemCnt === this._columns)
          partWidth = (vw - this._columnGap * (this._lineItemCnt - 1)) / this._lineItemCnt;
        if (this._lineItemCnt2 === this._rows)
          partHeight = (vh - this._rowGap * (this._lineItemCnt2 - 1)) / this._lineItemCnt2;
      }
      let pool = this._owner.itemPool;
      let url = pool.defaultRes.url;
      this._itemInfoVer++;
      for (let i = startIndex; i < lastIndex; i++) {
        if (i >= this._realNumItems)
          continue;
        let col = i % this._lineItemCnt;
        if (i - startIndex < pageSize) {
          if (col < startCol)
            continue;
        } else {
          if (col > startCol)
            continue;
        }
        this._items[i].flag = this._itemInfoVer;
      }
      let lastObj = null;
      let insertIndex = 0;
      for (let i = startIndex; i < lastIndex; i++) {
        if (i >= this._realNumItems)
          continue;
        let ii = this._items[i];
        if (ii.flag != this._itemInfoVer)
          continue;
        if (ii.obj == null) {
          while (reuseIndex < virtualItemCount) {
            let ii2 = this._items[reuseIndex];
            if (ii2.obj && ii2.flag != this._itemInfoVer) {
              if (ii2.obj instanceof Button)
                ii2.selected = ii2.obj.selected;
              ii.obj = ii2.obj;
              ii2.obj = null;
              break;
            }
            reuseIndex++;
          }
          if (insertIndex === -1)
            insertIndex = this._owner.getChildIndex(lastObj) + 1;
          if (ii.obj == null) {
            if (this._owner.itemProvider) {
              url = this._owner.itemProvider(i % this._numItems);
              if (!url)
                url = pool.defaultRes.url;
            }
            ii.obj = pool.getObject(url);
            this._owner.addChildAt(ii.obj, insertIndex);
          } else {
            insertIndex = this._owner.setChildIndexBefore(ii.obj, insertIndex);
          }
          insertIndex++;
          if (ii.obj instanceof Button)
            ii.obj.selected = ii.selected;
          needRender = true;
        } else {
          needRender = forceUpdate;
          insertIndex = -1;
          lastObj = ii.obj;
        }
        if (needRender) {
          if (partWidth != null || partHeight != null)
            ii.obj.setSize(partWidth ?? ii.obj.width, partHeight ?? ii.obj.height);
          this._owner.itemRenderer(i % this._numItems, ii.obj);
          Layout.refreshAllLayouts(this._owner);
          ii.width = Math.ceil(ii.obj.width);
          ii.height = Math.ceil(ii.obj.height);
        }
      }
      let borderX = startIndex / pageSize * vw;
      let xx = borderX;
      let yy = 0;
      let lineHeight = 0;
      for (let i = startIndex; i < lastIndex; i++) {
        if (i >= this._realNumItems)
          continue;
        let ii = this._items[i];
        if (ii.flag === this._itemInfoVer)
          ii.obj.setLeftTop(xx, yy);
        if (ii.height > lineHeight)
          lineHeight = ii.height;
        if (i % this._lineItemCnt === this._lineItemCnt - 1) {
          xx = borderX;
          yy += lineHeight + this._rowGap;
          lineHeight = 0;
          if (i === startIndex + pageSize - 1) {
            borderX += vw;
            xx = borderX;
            yy = 0;
          }
        } else
          xx += ii.width + this._columnGap;
      }
      for (let i = reuseIndex; i < virtualItemCount; i++) {
        let ii = this._items[i];
        if (ii.flag != this._itemInfoVer && ii.obj) {
          if (ii.obj instanceof Button)
            ii.selected = ii.obj.selected;
          this._owner.removeChildToPool(ii.obj);
          ii.obj = null;
        }
      }
    }
    handleScroll4(forceUpdate) {
      let pos = this._owner.scroller.scrollingPosY;
      s_n = pos;
      let newFirstIndex = this.getIndexOnPos4(forceUpdate);
      pos = s_n;
      if (newFirstIndex === this._firstIndex && !forceUpdate)
        return;
      let oldFirstIndex = this._firstIndex;
      this._firstIndex = newFirstIndex;
      let reuseIndex = oldFirstIndex;
      let virtualItemCount = this._items.length;
      let pageSize = this._lineItemCnt * this._lineItemCnt2;
      let startRow = newFirstIndex % this._lineItemCnt;
      let vw = this.viewWidth;
      let vh = this.viewHeight;
      let page = Math.floor(newFirstIndex / pageSize);
      let startIndex = page * pageSize;
      let lastIndex = startIndex + pageSize * 2;
      let needRender;
      let partWidth, partHeight;
      if (this._stretchX === 1 /* Stretch */ || this._stretchY === 1 /* Stretch */) {
        if (this._lineItemCnt2 === this._columns)
          partWidth = (vw - this._columnGap * (this._lineItemCnt2 - 1)) / this._lineItemCnt2;
        if (this._lineItemCnt === this._rows)
          partHeight = (vh - this._rowGap * (this._lineItemCnt - 1)) / this._lineItemCnt;
      }
      let pool = this._owner.itemPool;
      let url = pool.defaultRes.url;
      this._itemInfoVer++;
      for (let i = startIndex; i < lastIndex; i++) {
        if (i >= this._realNumItems)
          continue;
        let col = i % this._lineItemCnt;
        if (i - startIndex < pageSize) {
          if (col < startRow)
            continue;
        } else {
          if (col > startRow)
            continue;
        }
        let ii = this._items[i];
        ii.flag = this._itemInfoVer;
      }
      let lastObj = null;
      let insertIndex = 0;
      for (let i = startIndex; i < lastIndex; i++) {
        if (i >= this._realNumItems)
          continue;
        let ii = this._items[i];
        if (ii.flag != this._itemInfoVer)
          continue;
        if (ii.obj == null) {
          while (reuseIndex < virtualItemCount) {
            let ii2 = this._items[reuseIndex];
            if (ii2.obj && ii2.flag != this._itemInfoVer) {
              if (ii2.obj instanceof Button)
                ii2.selected = ii2.obj.selected;
              ii.obj = ii2.obj;
              ii2.obj = null;
              break;
            }
            reuseIndex++;
          }
          if (insertIndex === -1)
            insertIndex = this._owner.getChildIndex(lastObj) + 1;
          if (ii.obj == null) {
            if (this._owner.itemProvider) {
              url = this._owner.itemProvider(i % this._numItems);
              if (!url)
                url = pool.defaultRes.url;
            }
            ii.obj = pool.getObject(url);
            this._owner.addChildAt(ii.obj, insertIndex);
          } else {
            insertIndex = this._owner.setChildIndexBefore(ii.obj, insertIndex);
          }
          insertIndex++;
          if (ii.obj instanceof Button)
            ii.obj.selected = ii.selected;
          needRender = true;
        } else {
          needRender = forceUpdate;
          insertIndex = -1;
          lastObj = ii.obj;
        }
        if (needRender) {
          if (partWidth != null || partHeight != null)
            ii.obj.setSize(partWidth ?? ii.obj.width, partHeight ?? ii.obj.height);
          this._owner.itemRenderer(i % this._numItems, ii.obj);
          Layout.refreshAllLayouts(this._owner);
          ii.width = Math.ceil(ii.obj.width);
          ii.height = Math.ceil(ii.obj.height);
        }
      }
      let borderY = startIndex / pageSize * vh;
      let xx = 0;
      let yy = borderY;
      let lineWidth = 0;
      for (let i = startIndex; i < lastIndex; i++) {
        if (i >= this._realNumItems)
          continue;
        let ii = this._items[i];
        if (ii.flag === this._itemInfoVer)
          ii.obj.setLeftTop(xx, yy);
        if (ii.width > lineWidth)
          lineWidth = ii.width;
        if (i % this._lineItemCnt === this._lineItemCnt - 1) {
          xx += lineWidth + this._columnGap;
          yy = borderY;
          lineWidth = 0;
          if (i === startIndex + pageSize - 1) {
            borderY += vh;
            xx = 0;
            yy = borderY;
          }
        } else
          yy += ii.height + this._rowGap;
      }
      for (let i = reuseIndex; i < virtualItemCount; i++) {
        let ii = this._items[i];
        if (ii.flag != this._itemInfoVer && ii.obj) {
          if (ii.obj instanceof Button)
            ii.selected = ii.obj.selected;
          this._owner.removeChildToPool(ii.obj);
          ii.obj = null;
        }
      }
    }
  };
  var s_n = 0;

  // src/ui/Scroller.ts
  var s_vec24 = new Vec2();
  var s_rect4 = new Rect();
  var s_rect22 = new Rect();
  var s_endPos = new Vec2();
  var s_oldChange = new Vec2();
  var s_gestureFlag = 0;
  var TWEEN_TIME_GO = 0.5;
  var TWEEN_TIME_DEFAULT = 0.3;
  var PULL_RATIO = 0.5;
  var Scroller = class _Scroller {
    constructor() {
      this._dir = 0;
      this._step = 0;
      this._decelerationRate = 0;
      this._barDisplay = 0;
      this._barDisplay2 = 0;
      this._touchEffect2 = 0;
      this._bouncebackEffect2 = 0;
      this._touchEffectButton = 0;
      this._xPos = 0;
      this._yPos = 0;
      this._velocityScale = 0;
      this._lastMoveTime = 0;
      this._aniFlag = 0;
      this._headerLockedSize = 0;
      this._footerLockedSize = 0;
      this._lastAutoScroll = 0;
      this._autoScrollThresold = 0;
      this._tweening = 0;
      /** @internal */
      this._loop = 0;
      this._maskContainer = UIElement.create();
      this._maskContainer.clipping = true;
      this._maskContainer.touchThrough = true;
      this._barMargin = [0, 0, 0, 0];
      this._viewSize = new Vec2();
      this._contentSize = new Vec2();
      this._pageSize = new Vec2(1, 1);
      this._overlapSize = new Vec2();
      this._tweenTime = new Vec2();
      this._tweenStart = new Vec2();
      this._tweenDuration = new Vec2();
      this._tweenChange = new Vec2();
      this._velocity = new Vec2();
      this._containerPos = new Vec2();
      this._beginTouchPos = new Vec2();
      this._lastTouchPos = new Vec2();
      this._lastTouchGlobalPos = new Vec2();
      this._step = UIConfig.defaultScrollStep;
      this._decelerationRate = UIConfig.defaultScrollDecelerationRate;
      this._barDisplay = UIConfig.defaultScrollBarDisplay;
      this._touchEffect = UIConfig.defaultScrollTouchEffect;
      this._bouncebackEffect = UIConfig.defaultScrollTouchEffect;
    }
    get owner() {
      return this._owner;
    }
    set owner(value) {
      if (this._owner == value)
        return;
      if (this._owner) {
        this._owner.offAllCaller(this);
        if (this._tweening != 0)
          Timers.remove(this.tweenUpdate, this);
        if (this._hScrollBar) {
          this._hScrollBar._setParent(null);
          this._hScrollBar.destroy();
          this._hScrollBar = null;
        }
        if (this._vScrollBar) {
          this._vScrollBar._setParent(null);
          this._vScrollBar.destroy();
          this._vScrollBar = null;
        }
        if (this._header) {
          this._header._setParent(null);
          this._header.destroy();
          this._header = null;
        }
        if (this._footer) {
          this._footer._setParent(null);
          this._footer.destroy();
          this._footer = null;
        }
        this._maskContainer.removeSelf();
        this._owner.element.appendChild(this._container);
        this._container.setPos(0, 0);
        this._owner.setLayoutChangedFlag();
      }
      this._owner = value;
      if (value) {
        this._layout = value.layout;
        this._container = value.container;
        this._container.setPos(0, 0);
        value.element.appendChild(this._maskContainer);
        this._maskContainer.appendChild(this._container);
        if (!SerializeUtil.isDeserializing) {
          value.clipping = true;
          this._setDefaultDirection();
        }
        this.createHzScrollBar();
        this.createVtScrollBar();
        value.on("pointer_down", this._touchBegin, this);
        value.on("pointer_move", this._touchMove, this);
        value.on("pointer_up", this._touchEnd, this);
        value.on("mouse_wheel", this._mouseWheel, this);
        value.on("roll_over", this._rollOver, this);
        value.on("roll_out", this._rollOut, this);
        value.on("native_dragover", this._dragOver, this);
        value.setLayoutChangedFlag();
        this._processClipping();
        this._ownerSizeChanged();
      }
    }
    destroy() {
      this.owner = null;
    }
    get hScrollBar() {
      return this._hScrollBar;
    }
    get vScrollBar() {
      return this._vScrollBar;
    }
    get header() {
      return this._header;
    }
    get footer() {
      return this._footer;
    }
    get hScrollBarRes() {
      return this._hScrollBarRes;
    }
    set hScrollBarRes(value) {
      this._hScrollBarRes = value;
      if (this._hScrollBar)
        this._hScrollBar._setBit(NodeFlags.OBSOLUTE, true);
      this.createHzScrollBar();
    }
    get vScrollBarRes() {
      return this._vScrollBarRes;
    }
    set vScrollBarRes(value) {
      this._vScrollBarRes = value;
      if (this._vScrollBar)
        this._vScrollBar._setBit(NodeFlags.OBSOLUTE, true);
      this.createVtScrollBar();
    }
    get headerRes() {
      return this._headerRes;
    }
    set headerRes(value) {
      this._headerRes = value;
      this.createHeader();
    }
    get footerRes() {
      return this._footerRes;
    }
    set footerRes(value) {
      this._footerRes = value;
      this.createFooter();
    }
    get direction() {
      return this._dir;
    }
    set direction(value) {
      if (this._dir != value) {
        this._dir = value;
        if (this._refreshBarAxis != null)
          this._refreshBarAxis = this._dir == 2 /* Both */ || this._dir == 0 /* Vertical */ ? "y" : "x";
        this.createHzScrollBar();
        this.createVtScrollBar();
      }
    }
    get barDisplay() {
      return this._barDisplay2;
    }
    set barDisplay(value) {
      if (this._barDisplay2 != value) {
        this._barDisplay2 = value;
        this._barDisplay = value == 0 /* Default */ ? UIConfig.defaultScrollBarDisplay : value;
        this.createHzScrollBar();
        this.createVtScrollBar();
      }
    }
    get barOnLeft() {
      return this._barOnLeft;
    }
    set barOnLeft(value) {
      if (this._barOnLeft != value) {
        this._barOnLeft = value;
        this.onSizeChanged();
      }
    }
    get barFloating() {
      return this._barFloating;
    }
    set barFloating(value) {
      if (this._barFloating != value) {
        this._barFloating = value;
        this.onSizeChanged();
      }
    }
    get barMargin() {
      return this._barMargin;
    }
    set barMargin(value) {
      if (value == null || !Array.isArray(value))
        value = [0, 0, 0, 0];
      this._barMargin = value;
      this.onSizeChanged();
    }
    get bouncebackEffect() {
      return this._bouncebackEffect2;
    }
    set bouncebackEffect(value) {
      this._bouncebackEffect2 = value;
      if (value == 0 /* Default */)
        this._bouncebackEffect = UIConfig.defaultScrollBounceEffect;
      else
        this._bouncebackEffect = value == 1 /* On */;
    }
    get touchEffect() {
      return this._touchEffect2;
    }
    set touchEffect(value) {
      this._touchEffect2 = value;
      if (value == 0 /* Default */)
        this._touchEffect = UIConfig.defaultScrollTouchEffect;
      else
        this._touchEffect = value == 1 /* On */;
    }
    get touchEffectButton() {
      return this._touchEffectButton;
    }
    set touchEffectButton(value) {
      this._touchEffectButton = value;
    }
    get pageMode() {
      return this._pageMode;
    }
    set pageMode(value) {
      this._pageMode = value;
    }
    set step(value) {
      this._step = value;
    }
    get step() {
      return this._step;
    }
    get snapToItem() {
      return this._snapToItem;
    }
    set snapToItem(value) {
      this._snapToItem = value;
    }
    get inertiaDisabled() {
      return this._inertiaDisabled;
    }
    set inertiaDisabled(value) {
      this._inertiaDisabled = value;
    }
    get paddingMaskDisabled() {
      return this._paddingMaskDisabled;
    }
    set paddingMaskDisabled(value) {
      if (this._paddingMaskDisabled != value) {
        this._paddingMaskDisabled = value;
        this._processClipping();
      }
    }
    get mouseWheelDisabled() {
      return this._mouseWheelDisabled;
    }
    set mouseWheelDisabled(value) {
      this._mouseWheelDisabled = value;
    }
    get decelerationRate() {
      return this._decelerationRate;
    }
    set decelerationRate(value) {
      this._decelerationRate = value;
    }
    get fixedGripSize() {
      return this._fixedGripSize;
    }
    set fixedGripSize(value) {
      if (this._fixedGripSize != value) {
        this._fixedGripSize = value;
        if (this._vScrollBar)
          this._vScrollBar._setBit(NodeFlags.OBSOLUTE, true);
        if (this._hScrollBar)
          this._hScrollBar._setBit(NodeFlags.OBSOLUTE, true);
        this.createHzScrollBar();
        this.createVtScrollBar();
      }
    }
    get isDragged() {
      return this._dragged;
    }
    get percX() {
      return this._overlapSize.x == 0 ? 0 : this._xPos / this._overlapSize.x;
    }
    set percX(value) {
      this.setPercX(value, false);
    }
    setPercX(value, ani) {
      this._layout.refresh();
      this.setPosX(this._overlapSize.x * clamp01(value), ani);
    }
    get percY() {
      return this._overlapSize.y == 0 ? 0 : this._yPos / this._overlapSize.y;
    }
    set percY(value) {
      this.setPercY(value, false);
    }
    setPercY(value, ani) {
      this._layout.refresh();
      this.setPosY(this._overlapSize.y * clamp01(value), ani);
    }
    get posX() {
      return this._xPos;
    }
    set posX(value) {
      this.setPosX(value, false);
    }
    setPosX(value, ani) {
      this._layout.refresh();
      if (this._loop == 1)
        value = this.loopCheckingNewPos(value, "x");
      value = clamp(value, 0, this._overlapSize.x);
      if (value != this._xPos) {
        this._xPos = value;
        this.posChanged(ani);
      }
    }
    get posY() {
      return this._yPos;
    }
    set posY(value) {
      this.setPosY(value, false);
    }
    setPosY(value, ani) {
      this._layout.refresh();
      if (this._loop == 1)
        value = this.loopCheckingNewPos(value, "y");
      value = clamp(value, 0, this._overlapSize.y);
      if (value != this._yPos) {
        this._yPos = value;
        this.posChanged(ani);
      }
    }
    get contentWidth() {
      return this._contentSize.x;
    }
    get contentHeight() {
      return this._contentSize.y;
    }
    get viewWidth() {
      return this._viewSize.x;
    }
    get viewHeight() {
      return this._viewSize.y;
    }
    setViewSize(width, height) {
      this._owner.viewWidth = width;
      this._owner.viewHeight = height;
    }
    get _extraPaddingX() {
      return this._vScrollBar && !this._barFloating ? this._vScrollBar.width : 0;
    }
    get _extraPaddingY() {
      return this._hScrollBar && !this._barFloating ? this._hScrollBar.height : 0;
    }
    get pageX() {
      if (!this._pageMode)
        return 0;
      let page = Math.floor(this._xPos / this._pageSize.x);
      if (this._xPos - page * this._pageSize.x > this._pageSize.x * 0.5)
        page++;
      return page;
    }
    set pageX(value) {
      this.setPageX(value, false);
    }
    get pageY() {
      if (!this._pageMode)
        return 0;
      let page = Math.floor(this._yPos / this._pageSize.y);
      if (this._yPos - page * this._pageSize.y > this._pageSize.y * 0.5)
        page++;
      return page;
    }
    set pageY(value) {
      this.setPageY(value, false);
    }
    setPageX(value, ani) {
      if (!this._pageMode)
        return;
      this._layout.refresh();
      if (this._overlapSize.x > 0)
        this.setPosX(value * this._pageSize.x, ani);
    }
    setPageY(value, ani) {
      if (!this._pageMode)
        return;
      this._layout.refresh();
      if (this._overlapSize.y > 0)
        this.setPosY(value * this._pageSize.y, ani);
    }
    get isBottomMost() {
      return this._yPos == this._overlapSize.y || this._overlapSize.y == 0;
    }
    get isRightMost() {
      return this._xPos == this._overlapSize.x || this._overlapSize.x == 0;
    }
    get scrollingPosX() {
      return clamp(-this._container.x, 0, this._overlapSize.x);
    }
    get scrollingPosY() {
      return clamp(-this._container.y, 0, this._overlapSize.y);
    }
    scrollTop(ani) {
      this.setPercY(0, ani);
    }
    scrollBottom(ani) {
      this.setPercY(1, ani);
    }
    scrollUp(ratio, ani) {
      ratio = ratio || 1;
      if (this._pageMode)
        this.setPosY(this._yPos - this._pageSize.y * ratio, ani);
      else
        this.setPosY(this._yPos - this._step * ratio, ani);
      ;
    }
    scrollDown(ratio, ani) {
      ratio = ratio || 1;
      if (this._pageMode)
        this.setPosY(this._yPos + this._pageSize.y * ratio, ani);
      else
        this.setPosY(this._yPos + this._step * ratio, ani);
    }
    scrollLeft(ratio, ani) {
      ratio = ratio || 1;
      if (this._pageMode)
        this.setPosX(this._xPos - this._pageSize.x * ratio, ani);
      else
        this.setPosX(this._xPos - this._step * ratio, ani);
    }
    scrollRight(ratio, ani) {
      ratio = ratio || 1;
      if (this._pageMode)
        this.setPosX(this._xPos + this._pageSize.x * ratio, ani);
      else
        this.setPosX(this._xPos + this._step * ratio, ani);
    }
    getRect(target, rect) {
      if (target.parent != this._owner) {
        target.parent.localToGlobalRect(
          target.x,
          target.y,
          target.width,
          target.height,
          rect
        );
        this._owner.container.globalToLocal(rect.x, rect.y, s_vec24);
        let x = s_vec24.x;
        let y = s_vec24.y;
        this._owner.container.globalToLocal(rect.xMax, rect.yMax, s_vec24);
        rect.x = x;
        rect.y = y;
        rect.xMax = s_vec24.x;
        rect.yMax = s_vec24.y;
      } else {
        rect.set(target.x, target.y, target.width, target.height);
      }
      return rect;
    }
    scrollTo(target, ani, setFirst) {
      this._layout.refresh();
      if (this._needRefresh)
        this.refresh();
      let rect;
      if (typeof target === "number") {
        if (this._layout instanceof ListLayout && this._layout._virtual)
          target = this._layout.getRectByItemIndex(target);
        else
          target = this._owner.getChildAt(target);
      }
      if (target instanceof Rect)
        rect = target;
      else if (target.parent == null)
        return;
      else
        rect = this.getRect(target, s_rect4);
      let setFirstX, setFirstY;
      if (setFirst instanceof Widget) {
        if (setFirst != target && setFirst.parent != null) {
          let rect2 = this.getRect(setFirst, s_rect22);
          if (this._overlapSize.x > 0 && rect.xMax - rect2.x > this._viewSize.x) {
            rect.x = rect2.x;
            rect.width = rect2.width;
            setFirstX = true;
          }
          if (this._overlapSize.y > 0 && rect.yMax - rect2.y > this._viewSize.y) {
            rect.y = rect2.y;
            rect.height = rect2.height;
            setFirstY = true;
          }
        } else
          setFirstX = setFirstY = false;
      } else
        setFirstX = setFirstY = !!setFirst;
      if (this._overlapSize.y > 0) {
        let bottom = this._yPos + this._viewSize.y;
        if (setFirstX || rect.y <= this._yPos) {
          if (!setFirstX && rect.y + rect.height >= bottom)
            return;
          if (this._pageMode)
            this.setPosY(Math.floor(rect.y / this._pageSize.y) * this._pageSize.y, ani);
          else
            this.setPosY(rect.y, ani);
        } else if (rect.y + rect.height > bottom) {
          if (this._pageMode)
            this.setPosY(Math.floor(rect.y / this._pageSize.y) * this._pageSize.y, ani);
          else if (rect.height <= this._viewSize.y / 2)
            this.setPosY(rect.y + rect.height * 2 - this._viewSize.y, ani);
          else
            this.setPosY(rect.y + Math.min(rect.height - this._viewSize.y, 0), ani);
        }
      }
      if (this._overlapSize.x > 0) {
        let right = this._xPos + this._viewSize.x;
        if (setFirstY || rect.x <= this._xPos) {
          if (!setFirstY && rect.x + rect.width >= right)
            return;
          if (this._pageMode)
            this.setPosX(Math.floor(rect.x / this._pageSize.x) * this._pageSize.x, ani);
          else
            this.setPosX(rect.x, ani);
        } else if (rect.x + rect.width > right) {
          if (this._pageMode)
            this.setPosX(Math.floor(rect.x / this._pageSize.x) * this._pageSize.x, ani);
          else if (rect.width <= this._viewSize.x / 2)
            this.setPosX(rect.x + rect.width * 2 - this._viewSize.x, ani);
          else
            this.setPosX(rect.x + Math.min(rect.width - this._viewSize.x, 0), ani);
        }
      }
      if (!ani && this._needRefresh)
        this.refresh();
    }
    isChildInView(obj) {
      if (this._overlapSize.y > 0) {
        let dist = obj.top + this._container.y;
        if (dist < -obj.height || dist > this._viewSize.y)
          return false;
      }
      if (this._overlapSize.x > 0) {
        let dist = obj.left + this._container.x;
        if (dist < -obj.width || dist > this._viewSize.x)
          return false;
      }
      return true;
    }
    getFirstChildInView() {
      let i = 0;
      for (let child of this._owner.children) {
        if (this.isChildInView(child))
          return i;
        i++;
      }
      return -1;
    }
    cancelDragging() {
      this._owner.findRoot().inputMgr.removeCaptor(this._owner);
      if (_Scroller.draggingInst == this)
        _Scroller.draggingInst = null;
      s_gestureFlag = 0;
      this._dragged = false;
    }
    _setDefaultDirection() {
      let layout = this._layout;
      if (layout.pageMode)
        return;
      if (layout.type == 1 /* SingleColumn */ || layout.type == 3 /* FlowX */)
        this.direction = 0 /* Vertical */;
      else if (layout.type == 2 /* SingleRow */ || layout.type == 4 /* FlowY */)
        this.direction = 1 /* Horizontal */;
    }
    createVtScrollBar() {
      if (!this._owner)
        return;
      if (this._barDisplay != 5 /* Hidden */ && (this._dir == 2 /* Both */ || this._dir == 0 /* Vertical */)) {
        if (this._vScrollBar && !this._vScrollBar._getBit(NodeFlags.OBSOLUTE))
          return;
        let res = this._vScrollBarRes ? this._vScrollBarRes : UIConfig.verticalScrollBar;
        if (res) {
          this._vScrollBar = res.create();
          if (!this._vScrollBar) {
            console.warn("failed to create a vertical scrollbar");
            return;
          }
          this._vScrollBar.hideFlags |= HideFlags.HideAndDontSave;
          this._vScrollBar.setOwner(this, true);
          this._vScrollBar.element.visible = this._barDisplay != 3 /* OnScroll */;
          if (this._fixedGripSize)
            this._vScrollBar.fixedGripSize = true;
          this._owner.element.appendChild(this._vScrollBar.element);
          this._vScrollBar._setParent(this._owner);
          this.onSizeChanged();
        }
      } else if (this._vScrollBar) {
        this._vScrollBar._setParent(null);
        this._vScrollBar.destroy();
        this._vScrollBar = null;
        this.onSizeChanged();
      }
    }
    createHzScrollBar() {
      if (!this._owner)
        return;
      if (this._barDisplay != 5 /* Hidden */ && (this._dir == 2 /* Both */ || this._dir == 1 /* Horizontal */)) {
        if (this._hScrollBar && !this._hScrollBar._getBit(NodeFlags.OBSOLUTE))
          return;
        let res = this._hScrollBarRes ? this._hScrollBarRes : UIConfig.horizontalScrollBar;
        if (res) {
          this._hScrollBar = res.create();
          if (!this._hScrollBar) {
            console.warn("failed to create a horizontal scrollbar");
            return;
          }
          this._hScrollBar.hideFlags |= HideFlags.HideAndDontSave;
          this._hScrollBar.setOwner(this, false);
          this._hScrollBar.element.visible = this._barDisplay != 3 /* OnScroll */;
          if (this._fixedGripSize)
            this._hScrollBar.fixedGripSize = true;
          this._owner.element.appendChild(this._hScrollBar.element);
          this._hScrollBar._setParent(this._owner);
          this.onSizeChanged();
        }
      } else if (this._hScrollBar) {
        this._hScrollBar._setParent(null);
        this._hScrollBar.destroy();
        this._hScrollBar = null;
        this.onSizeChanged();
      }
    }
    createHeader() {
      if (this._header) {
        this._header._setParent(null);
        this._header.destroy();
        this._header = null;
      }
      if (this._headerRes) {
        this._header = this._headerRes.create();
        if (this._header)
          this._header.hideFlags |= HideFlags.HideAndDontSave;
      }
      if (this._header || this._footer)
        this._refreshBarAxis = this._dir == 2 /* Both */ || this._dir == 0 /* Vertical */ ? "y" : "x";
      else
        this._refreshBarAxis = null;
    }
    createFooter() {
      if (this._footer) {
        this._footer._setParent(null);
        this._footer.destroy();
        this._footer = null;
      }
      if (this._footerRes) {
        this._footer = this._footerRes.create();
        if (this._footer)
          this._footer.hideFlags |= HideFlags.HideAndDontSave;
      }
      if (this._header || this._footer)
        this._refreshBarAxis = this._dir == 2 /* Both */ || this._dir == 0 /* Vertical */ ? "y" : "x";
      else
        this._refreshBarAxis = null;
    }
    lockHeader(size) {
      if (this._headerLockedSize == size)
        return;
      this._headerLockedSize = size;
      if (!this._refreshEventDispatching && this._container[this._refreshBarAxis] >= 0) {
        this._tweenStart.set(this._container.x, this._container.y);
        this._tweenChange.set(0, 0);
        this._tweenChange[this._refreshBarAxis] = this._headerLockedSize - this._tweenStart[this._refreshBarAxis];
        this._tweenDuration.set(TWEEN_TIME_DEFAULT, TWEEN_TIME_DEFAULT);
        this.startTween(2);
      }
    }
    lockFooter(size) {
      if (this._footerLockedSize == size)
        return;
      this._footerLockedSize = size;
      if (!this._refreshEventDispatching && this._container[this._refreshBarAxis] <= -this._overlapSize[this._refreshBarAxis]) {
        this._tweenStart.set(this._container.x, this._container.y);
        this._tweenChange.set(0, 0);
        let max = this._overlapSize[this._refreshBarAxis];
        if (max == 0)
          max = Math.max(this._contentSize[this._refreshBarAxis] + this._footerLockedSize - this._viewSize[this._refreshBarAxis], 0);
        else
          max += this._footerLockedSize;
        this._tweenChange[this._refreshBarAxis] = -max - this._tweenStart[this._refreshBarAxis];
        this._tweenDuration.set(TWEEN_TIME_DEFAULT, TWEEN_TIME_DEFAULT);
        this.startTween(2);
      }
    }
    _prepareActiveChangeList(active, out) {
      if (this._hScrollBar)
        this._hScrollBar._prepareActiveChangeList(active, out);
      if (this._vScrollBar)
        this._vScrollBar._prepareActiveChangeList(active, out);
      if (this._header)
        this._header._prepareActiveChangeList(active, out);
      if (this._footer)
        this._footer._prepareActiveChangeList(active, out);
    }
    _shouldCheckOverflow() {
      if (this._barDisplay == 2 /* OnOverflow */ || this._barDisplay == 4 /* OnOverflowAndScroll */)
        return (this._vScrollBar != null ? 1 : 0) + (this._hScrollBar != null ? 2 : 0);
      else
        return null;
    }
    _processClipping() {
      if (this._owner)
        this._maskContainer.clipping = !this._paddingMaskDisabled && this._owner.clipping && !this._owner._getBit(NodeFlags.DISABLE_CLIPPING);
    }
    _ownerSizeChanged() {
      this.onSizeChanged();
      this.posChanged(false);
    }
    onSizeChanged() {
      if (!this._owner)
        return;
      let aWidth = this._owner.width;
      let aHeight = this._owner.height;
      let padding = this._layout.padding;
      let mx, my;
      if (this._barOnLeft && this._vScrollBar && !this._barFloating)
        mx = Math.floor(padding[3] + this._vScrollBar.width);
      else
        mx = Math.floor(padding[3]);
      my = Math.floor(padding[0]);
      this._maskContainer.setPos(mx, my);
      if (this._hScrollBar) {
        this._hScrollBar.y = aHeight - this._hScrollBar.height;
        if (this._vScrollBar) {
          this._hScrollBar.width = aWidth - this._vScrollBar.width - this._barMargin[3] - this._barMargin[1];
          if (this._barOnLeft)
            this._hScrollBar.x = this._barMargin[3] + this._vScrollBar.width;
          else
            this._hScrollBar.x = this._barMargin[3];
        } else {
          this._hScrollBar.width = aWidth - this._barMargin[3] - this._barMargin[1];
          this._hScrollBar.x = this._barMargin[3];
        }
      }
      if (this._vScrollBar) {
        if (!this._barOnLeft)
          this._vScrollBar.x = aWidth - this._vScrollBar.width;
        if (this._hScrollBar)
          this._vScrollBar.height = aHeight - this._hScrollBar.height - this._barMargin[0] - this._barMargin[2];
        else
          this._vScrollBar.height = aHeight - this._barMargin[0] - this._barMargin[2];
        this._vScrollBar.y = this._barMargin[0];
      }
      this._viewSize.x = Math.max(1, this._owner.viewWidth);
      this._viewSize.y = Math.max(1, this._owner.viewHeight);
      this._pageSize.x = this._viewSize.x;
      this._pageSize.y = this._viewSize.y;
      this.onContentSizeChanged();
    }
    _ownerContentSizeChanged() {
      let aWidth = this._layout.contentWidth;
      let aHeight = this._layout.contentHeight;
      if (this._contentSize.x == aWidth && this._contentSize.y == aHeight)
        return;
      this._contentSize.x = aWidth;
      this._contentSize.y = aHeight;
      this.onContentSizeChanged();
    }
    _changeContentSizeOnScrolling(deltaWidth, deltaHeight, deltaPosX, deltaPosY) {
      let isRightmost = this._xPos != 0 && this._xPos == this._overlapSize.x;
      let isBottom = this._yPos != 0 && this._yPos == this._overlapSize.y;
      this._contentSize.x += deltaWidth;
      this._contentSize.y += deltaHeight;
      this.onContentSizeChanged();
      if (this._tweening == 1) {
        if (deltaWidth != 0 && isRightmost && this._tweenChange.x < 0) {
          this._xPos = this._overlapSize.x;
          this._tweenChange.x = -this._xPos - this._tweenStart.x;
        }
        if (deltaHeight != 0 && isBottom && this._tweenChange.y < 0) {
          this._yPos = this._overlapSize.y;
          this._tweenChange.y = -this._yPos - this._tweenStart.y;
        }
      } else if (this._tweening == 2) {
        if (deltaPosX != 0) {
          this._container.x -= deltaPosX;
          this._tweenStart.x -= deltaPosX;
          this._xPos = -this._container.x;
        }
        if (deltaPosY != 0) {
          this._container.y -= deltaPosY;
          this._tweenStart.y -= deltaPosY;
          this._yPos = -this._container.y;
        }
      } else if (this._dragged) {
        if (deltaPosX != 0) {
          this._container.x -= deltaPosX;
          this._containerPos.x -= deltaPosX;
          this._xPos = -this._container.x;
        }
        if (deltaPosY != 0) {
          this._container.y -= deltaPosY;
          this._containerPos.y -= deltaPosY;
          this._yPos = -this._container.y;
        }
      } else {
        if (deltaWidth != 0 && isRightmost) {
          this._xPos = this._overlapSize.x;
          this._container.x = -this._xPos;
        }
        if (deltaHeight != 0 && isBottom) {
          this._yPos = this._overlapSize.y;
          this._container.y = -this._yPos;
        }
      }
    }
    onContentSizeChanged() {
      if (!this._owner)
        return;
      if (this._barDisplay == 2 /* OnOverflow */ || this._barDisplay == 4 /* OnOverflowAndScroll */) {
        this._vScrollNone = this._contentSize.y <= this._viewSize.y;
        this._hScrollNone = this._contentSize.x <= this._viewSize.x;
        if (this._vScrollBar && this._hScrollBar) {
          if (!this._hScrollNone)
            this._vScrollBar.height = this._owner.height - this._hScrollBar.height - this._barMargin[0] - this._barMargin[2];
          else
            this._vScrollBar.height = this._owner.height - this._barMargin[0] - this._barMargin[2];
          if (!this._vScrollNone)
            this._hScrollBar.width = this._owner.width - this._vScrollBar.width - this._barMargin[3] - this._barMargin[1];
          else
            this._hScrollBar.width = this._owner.width - this._barMargin[3] - this._barMargin[1];
        }
      }
      if (this._vScrollBar) {
        if (this._contentSize.y == 0)
          this._vScrollBar.setDisplayPerc(0);
        else
          this._vScrollBar.setDisplayPerc(Math.min(1, this._viewSize.y / this._contentSize.y));
      }
      if (this._hScrollBar) {
        if (this._contentSize.x == 0)
          this._hScrollBar.setDisplayPerc(0);
        else
          this._hScrollBar.setDisplayPerc(Math.min(1, this._viewSize.x / this._contentSize.x));
      }
      this._updateScrollBarVisible();
      let mw = this._viewSize.x;
      let mh = this._viewSize.y;
      if (this._vScrollNone && this._vScrollBar != null)
        mw += this._vScrollBar.width;
      if (this._hScrollNone && this._hScrollBar != null)
        mh += this._hScrollBar.height;
      this._maskContainer.setSize(mw, mh);
      if (this._dir == 1 /* Horizontal */ || this._dir == 2 /* Both */)
        this._overlapSize.x = Math.ceil(Math.max(0, this._contentSize.x - this._viewSize.x));
      else
        this._overlapSize.x = 0;
      if (this._dir == 0 /* Vertical */ || this._dir == 2 /* Both */)
        this._overlapSize.y = Math.ceil(Math.max(0, this._contentSize.y - this._viewSize.y));
      else
        this._overlapSize.y = 0;
      this._xPos = clamp(this._xPos, 0, this._overlapSize.x);
      this._yPos = clamp(this._yPos, 0, this._overlapSize.y);
      if (this._refreshBarAxis) {
        let max = this._overlapSize[this._refreshBarAxis];
        if (max == 0)
          max = Math.max(this._contentSize[this._refreshBarAxis] + this._footerLockedSize - this._viewSize[this._refreshBarAxis], 0);
        else
          max += this._footerLockedSize;
        if (this._refreshBarAxis == "x") {
          this._container.setPos(
            clamp(this._container.x, -max, this._headerLockedSize),
            clamp(this._container.y, -this._overlapSize.y, 0)
          );
        } else {
          this._container.setPos(
            clamp(this._container.x, -this._overlapSize.x, 0),
            clamp(this._container.y, -max, this._headerLockedSize)
          );
        }
        if (this._header) {
          if (this._refreshBarAxis == "x")
            this._header.height = this._viewSize.y;
          else
            this._header.width = this._viewSize.x;
        }
        if (this._footer) {
          if (this._refreshBarAxis == "x")
            this._footer.height = this._viewSize.y;
          else
            this._footer.width = this._viewSize.x;
        }
      } else {
        this._container.setPos(
          clamp(this._container.x, -this._overlapSize.x, 0),
          clamp(this._container.y, -this._overlapSize.y, 0)
        );
      }
      this.updateScrollBarPos();
    }
    posChanged(ani) {
      if (this._aniFlag == 0)
        this._aniFlag = ani ? 1 : -1;
      else if (this._aniFlag == 1 && !ani)
        this._aniFlag = -1;
      this._needRefresh = true;
      Timers.callLater(this.refresh, this);
    }
    refresh() {
      if (this._owner == null)
        return;
      this._needRefresh = false;
      Timers.remove(this.refresh, this);
      if (this._pageMode || this._snapToItem) {
        s_endPos.set(-this._xPos, -this._yPos);
        this.alignPosition(s_endPos, false);
        this._xPos = -s_endPos.x;
        this._yPos = -s_endPos.y;
      }
      this.refresh2();
      this._owner.emit("scroll");
      if (this._needRefresh) {
        this._needRefresh = false;
        Timers.remove(this.refresh, this);
        this.refresh2();
      }
      this.updateScrollBarPos();
      this._aniFlag = 0;
    }
    refresh2() {
      if (this._aniFlag == 1 && !this._dragged) {
        let posX;
        let posY;
        if (this._overlapSize.x > 0)
          posX = -Math.floor(this._xPos);
        else {
          if (this._container.x != 0)
            this._container.x = 0;
          posX = 0;
        }
        if (this._overlapSize.y > 0)
          posY = -Math.floor(this._yPos);
        else {
          if (this._container.y != 0)
            this._container.y = 0;
          posY = 0;
        }
        if (posX != this._container.x || posY != this._container.y) {
          this._tweenDuration.set(TWEEN_TIME_GO, TWEEN_TIME_GO);
          this._tweenStart.set(this._container.x, this._container.y);
          this._tweenChange.set(posX - this._tweenStart.x, posY - this._tweenStart.y);
          this.startTween(1);
        } else if (this._tweening != 0)
          this.killTween();
      } else {
        if (this._tweening != 0)
          this.killTween();
        this._container.setPos(Math.floor(-this._xPos), Math.floor(-this._yPos));
        this.loopCheckingCurrent();
      }
    }
    _touchBegin(evt) {
      if (!this._touchEffect || this._touchEffectButton != evt.input.button)
        return;
      evt.capturePointer();
      if (this._tweening != 0) {
        this.killTween();
        this._owner.findRoot().inputMgr.cancelClick(evt.input.pointerId);
        this._dragged = true;
      } else
        this._dragged = false;
      let pt = this._owner.globalToLocal(evt.input.x, evt.input.y, s_vec24);
      this._containerPos.set(this._container.x, this._container.y);
      this._beginTouchPos.set(pt.x, pt.y);
      this._lastTouchPos.set(pt.x, pt.y);
      this._lastTouchGlobalPos.set(evt.input.x, evt.input.y);
      this._isHoldAreaDone = false;
      this._velocity.set(0, 0);
      this._velocityScale = 1;
      this._lastMoveTime = performance.now() / 1e3;
    }
    _touchMove(evt) {
      if (!this._touchEffect || this.owner.destroyed)
        return;
      if (_Scroller.draggingInst && _Scroller.draggingInst != this || DragSupport.draggingInst)
        return;
      let sensitivity = UIConfig.touchScrollSensitivity;
      let pt = this._owner.globalToLocal(evt.input.x, evt.input.y);
      let diff;
      let sv, sh;
      if (this._dir == 0 /* Vertical */) {
        if (!this._isHoldAreaDone) {
          s_gestureFlag |= 1;
          diff = Math.abs(this._beginTouchPos.y - pt.y);
          if (diff < sensitivity)
            return;
          if ((s_gestureFlag & 2) != 0) {
            let diff2 = Math.abs(this._beginTouchPos.x - pt.x);
            if (diff < diff2)
              return;
          }
        }
        sv = true;
      } else if (this._dir == 1 /* Horizontal */) {
        if (!this._isHoldAreaDone) {
          s_gestureFlag |= 2;
          diff = Math.abs(this._beginTouchPos.x - pt.x);
          if (diff < sensitivity)
            return;
          if ((s_gestureFlag & 1) != 0) {
            let diff2 = Math.abs(this._beginTouchPos.y - pt.y);
            if (diff < diff2)
              return;
          }
        }
        sh = true;
      } else {
        s_gestureFlag = 3;
        if (!this._isHoldAreaDone) {
          diff = Math.abs(this._beginTouchPos.y - pt.y);
          if (diff < sensitivity) {
            diff = Math.abs(this._beginTouchPos.x - pt.x);
            if (diff < sensitivity)
              return;
          }
        }
        sv = sh = true;
      }
      let newPosX = Math.floor(this._containerPos.x + pt.x - this._beginTouchPos.x);
      let newPosY = Math.floor(this._containerPos.y + pt.y - this._beginTouchPos.y);
      if (sv) {
        if (newPosY > 0) {
          if (!this._bouncebackEffect)
            this._container.y = 0;
          else
            this._container.y = Math.floor(Math.min(newPosY * 0.5, this._viewSize.y * PULL_RATIO));
        } else if (newPosY < -this._overlapSize.y) {
          if (!this._bouncebackEffect)
            this._container.y = -this._overlapSize.y;
          else
            this._container.y = Math.floor(Math.max((newPosY + this._overlapSize.y) * 0.5, -this._viewSize.y * PULL_RATIO) - this._overlapSize.y);
        } else
          this._container.y = newPosY;
      }
      if (sh) {
        if (newPosX > 0) {
          if (!this._bouncebackEffect)
            this._container.x = 0;
          else
            this._container.x = Math.floor(Math.min(newPosX * 0.5, this._viewSize.x * PULL_RATIO));
        } else if (newPosX < 0 - this._overlapSize.x) {
          if (!this._bouncebackEffect)
            this._container.x = -this._overlapSize.x;
          else
            this._container.x = Math.floor(Math.max((newPosX + this._overlapSize.x) * 0.5, -this._viewSize.x * PULL_RATIO) - this._overlapSize.x);
        } else
          this._container.x = newPosX;
      }
      let frameRate = 60;
      let now = performance.now() / 1e3;
      let deltaTime = Math.max(now - this._lastMoveTime, 1 / frameRate);
      let deltaPositionX = pt.x - this._lastTouchPos.x;
      let deltaPositionY = pt.y - this._lastTouchPos.y;
      if (!sh)
        deltaPositionX = 0;
      if (!sv)
        deltaPositionY = 0;
      if (deltaTime != 0) {
        let elapsed = deltaTime * frameRate - 1;
        if (elapsed > 1) {
          let factor = Math.pow(0.833, elapsed);
          this._velocity.x = this._velocity.x * factor;
          this._velocity.y = this._velocity.y * factor;
        }
        this._velocity.x = lerp(this._velocity.x, deltaPositionX * 60 / frameRate / deltaTime, deltaTime * 10);
        this._velocity.y = lerp(this._velocity.y, deltaPositionY * 60 / frameRate / deltaTime, deltaTime * 10);
      }
      let deltaGlobalPositionX = this._lastTouchGlobalPos.x - evt.input.x;
      let deltaGlobalPositionY = this._lastTouchGlobalPos.y - evt.input.y;
      if (deltaPositionX != 0)
        this._velocityScale = Math.abs(deltaGlobalPositionX / deltaPositionX);
      else if (deltaPositionY != 0)
        this._velocityScale = Math.abs(deltaGlobalPositionY / deltaPositionY);
      this._lastTouchPos.set(pt.x, pt.y);
      this._lastTouchGlobalPos.set(evt.input.x, evt.input.y);
      this._lastMoveTime = now;
      if (this._overlapSize.x > 0)
        this._xPos = clamp(-this._container.x, 0, this._overlapSize.x);
      if (this._overlapSize.y > 0)
        this._yPos = clamp(-this._container.y, 0, this._overlapSize.y);
      if (this._loop != 0) {
        newPosX = this._container.x;
        newPosY = this._container.y;
        if (this.loopCheckingCurrent()) {
          this._containerPos.x += this._container.x - newPosX;
          this._containerPos.y += this._container.y - newPosY;
        }
      }
      _Scroller.draggingInst = this;
      this._isHoldAreaDone = true;
      this._dragged = true;
      this.updateScrollBarPos();
      this._updateScrollBarVisible();
      this._owner.emit("scroll");
    }
    _touchEnd() {
      if (_Scroller.draggingInst == this)
        _Scroller.draggingInst = null;
      s_gestureFlag = 0;
      if (!this._dragged || !this._touchEffect) {
        this._dragged = false;
        return;
      }
      this._dragged = false;
      this._tweenStart.set(this._container.x, this._container.y);
      s_endPos.set(this._tweenStart.x, this._tweenStart.y);
      let flag = false;
      if (this._container.x > 0) {
        s_endPos.x = 0;
        flag = true;
      } else if (this._container.x < -this._overlapSize.x) {
        s_endPos.x = -this._overlapSize.x;
        flag = true;
      }
      if (this._container.y > 0) {
        s_endPos.y = 0;
        flag = true;
      } else if (this._container.y < -this._overlapSize.y) {
        s_endPos.y = -this._overlapSize.y;
        flag = true;
      }
      if (flag) {
        this._tweenChange.set(s_endPos.x - this._tweenStart.x, s_endPos.y - this._tweenStart.y);
        if (this._tweenChange.x < -UIConfig.touchDragSensitivity || this._tweenChange.y < -UIConfig.touchDragSensitivity) {
          this._refreshEventDispatching = true;
          this._owner.emit("pull_down_release");
          this._refreshEventDispatching = false;
        } else if (this._tweenChange.x > UIConfig.touchDragSensitivity || this._tweenChange.y > UIConfig.touchDragSensitivity) {
          this._refreshEventDispatching = true;
          this._owner.emit("pull_up_release");
          this._refreshEventDispatching = false;
        }
        if (this._headerLockedSize > 0 && s_endPos[this._refreshBarAxis] == 0) {
          s_endPos[this._refreshBarAxis] = this._headerLockedSize;
          this._tweenChange.x = s_endPos.x - this._tweenStart.x;
          this._tweenChange.y = s_endPos.y - this._tweenStart.y;
        } else if (this._footerLockedSize > 0 && s_endPos[this._refreshBarAxis] == -this._overlapSize[this._refreshBarAxis]) {
          let max = this._overlapSize[this._refreshBarAxis];
          if (max == 0)
            max = Math.max(this._contentSize[this._refreshBarAxis] + this._footerLockedSize - this._viewSize[this._refreshBarAxis], 0);
          else
            max += this._footerLockedSize;
          s_endPos[this._refreshBarAxis] = -max;
          this._tweenChange.x = s_endPos.x - this._tweenStart.x;
          this._tweenChange.y = s_endPos.y - this._tweenStart.y;
        }
        this._tweenDuration.set(TWEEN_TIME_DEFAULT, TWEEN_TIME_DEFAULT);
      } else {
        if (!this._inertiaDisabled) {
          let frameRate = 60;
          let elapsed = (performance.now() / 1e3 - this._lastMoveTime) * frameRate - 1;
          if (elapsed > 1) {
            let factor = Math.pow(0.833, elapsed);
            this._velocity.x = this._velocity.x * factor;
            this._velocity.y = this._velocity.y * factor;
          }
          this.updateTargetAndDuration(this._tweenStart, s_endPos);
        } else
          this._tweenDuration.set(TWEEN_TIME_DEFAULT, TWEEN_TIME_DEFAULT);
        s_oldChange.set(s_endPos.x - this._tweenStart.x, s_endPos.y - this._tweenStart.y);
        this.loopCheckingTarget(s_endPos);
        if (this._pageMode || this._snapToItem)
          this.alignPosition(s_endPos, true);
        this._tweenChange.x = s_endPos.x - this._tweenStart.x;
        this._tweenChange.y = s_endPos.y - this._tweenStart.y;
        if (this._tweenChange.x == 0 && this._tweenChange.y == 0) {
          this._updateScrollBarVisible();
          return;
        }
        if (this._pageMode || this._snapToItem) {
          this.fixDuration("x", s_oldChange.x);
          this.fixDuration("y", s_oldChange.y);
        }
      }
      this.startTween(2);
    }
    _mouseWheel(evt) {
      if (this._mouseWheelDisabled || this._barDisplay == 5 /* Hidden */)
        return;
      let delta = evt.input.mouseWheelDelta / 40;
      if (this._snapToItem && Math.abs(delta) < 1)
        delta = Math.sign(delta);
      if (this._overlapSize.x > 0 && this._overlapSize.y == 0) {
        let step = this._pageMode ? this._pageSize.x : this._step;
        this.setPosX(this._xPos + step * delta, false);
        evt.stopPropagation();
      } else {
        let step = this._pageMode ? this._pageSize.y : this._step;
        this.setPosY(this._yPos + step * delta, false);
        evt.stopPropagation();
      }
    }
    _rollOver() {
      this._hover = true;
      if (this._barDisplay == 3 /* OnScroll */ || this._barDisplay == 4 /* OnOverflowAndScroll */)
        this._updateScrollBarVisible();
    }
    _rollOut() {
      this._hover = false;
      if (this._barDisplay == 3 /* OnScroll */ || this._barDisplay == 4 /* OnOverflowAndScroll */)
        this._updateScrollBarVisible();
    }
    _dragOver(evt) {
      let pt = this._maskContainer.globalToLocal(evt.input.x, evt.input.y);
      let flag = 0;
      if (this._overlapSize.y > 0 && this._layout.type != 2 /* SingleRow */) {
        if (pt.y < 10)
          flag = 1;
        else if (pt.y > this._maskContainer.height - 10)
          flag = 2;
      }
      if (this._overlapSize.x > 0 && this._layout.type != 1 /* SingleColumn */) {
        if (pt.x < 10)
          flag = 3;
        else if (pt.x > this._maskContainer.width - 10)
          flag = 4;
      }
      if (flag != 0) {
        if (this._lastAutoScroll == null || performance.now() - this._lastAutoScroll > 1e3)
          this._autoScrollThresold = 0;
        else
          this._autoScrollThresold += performance.now() - this._lastAutoScroll;
        this._lastAutoScroll = performance.now();
        if (this._autoScrollThresold < 800)
          return;
        switch (flag) {
          case 1:
            this.setPosY(this.posY - 10);
            break;
          case 2:
            this.setPosY(this.posY + 10);
            break;
          case 3:
            this.setPosX(this.posX - 10);
            break;
          case 4:
            this.setPosX(this.posX + 10);
            break;
        }
      }
    }
    updateScrollBarPos() {
      if (this._vScrollBar)
        this._vScrollBar.setScrollPerc(this._overlapSize.y == 0 ? 0 : clamp(-this._container.y, 0, this._overlapSize.y) / this._overlapSize.y);
      if (this._hScrollBar)
        this._hScrollBar.setScrollPerc(this._overlapSize.x == 0 ? 0 : clamp(-this._container.x, 0, this._overlapSize.x) / this._overlapSize.x);
      this.checkRefreshBar();
    }
    _updateScrollBarVisible() {
      if (this._vScrollBar) {
        if (this._viewSize.y <= this._vScrollBar.minSize || this._vScrollNone)
          this._vScrollBar.element.visible = false;
        else
          this.updateScrollBarVisible2(this._vScrollBar);
      }
      if (this._hScrollBar) {
        if (this._viewSize.x <= this._hScrollBar.minSize || this._hScrollNone)
          this._hScrollBar.element.visible = false;
        else
          this.updateScrollBarVisible2(this._hScrollBar);
      }
    }
    updateScrollBarVisible2(bar) {
      let flag = this._barDisplay == 3 /* OnScroll */ || this._barDisplay == 4 /* OnOverflowAndScroll */;
      if (flag)
        Tween.kill(bar, false, "alpha");
      if (flag && !this._hover && this._tweening == 0 && !this._dragged && !bar.gripDragging) {
        if (bar.element.visible)
          Tween.to(1, 0, 0.5).setDelay(0.5).onComplete(this._barTweenComplete, this).setTarget(bar, "alpha");
      } else {
        bar.alpha = 1;
        bar.element.visible = true;
      }
    }
    _barTweenComplete(tweener) {
      let bar = tweener.target;
      bar.alpha = 1;
      bar.element.visible = false;
    }
    getLoopPartSize(division, axis) {
      return (this._contentSize[axis] + (axis == "x" ? this._owner.layout.columnGap : this._owner.layout.rowGap)) / division;
    }
    loopCheckingCurrent() {
      let changed = false;
      if (this._loop == 1 && this._overlapSize.x > 0) {
        if (this._xPos < 1e-3) {
          this._xPos += this.getLoopPartSize(2, "x");
          changed = true;
        } else if (this._xPos >= this._overlapSize.x) {
          this._xPos -= this.getLoopPartSize(2, "x");
          changed = true;
        }
      } else if (this._loop == 2 && this._overlapSize.y > 0) {
        if (this._yPos < 1e-3) {
          this._yPos += this.getLoopPartSize(2, "y");
          changed = true;
        } else if (this._yPos >= this._overlapSize.y) {
          this._yPos -= this.getLoopPartSize(2, "y");
          changed = true;
        }
      }
      if (changed)
        this._container.setPos(Math.floor(-this._xPos), Math.floor(-this._yPos));
      return changed;
    }
    loopCheckingTarget(endPos) {
      if (this._loop == 1)
        this.loopCheckingTarget2(endPos, "x");
      if (this._loop == 2)
        this.loopCheckingTarget2(endPos, "y");
    }
    loopCheckingTarget2(endPos, axis) {
      let halfSize;
      let tmp;
      if (endPos[axis] > 0) {
        halfSize = this.getLoopPartSize(2, axis);
        tmp = this._tweenStart[axis] - halfSize;
        if (tmp <= 0 && tmp >= -this._overlapSize[axis]) {
          endPos[axis] -= halfSize;
          this._tweenStart[axis] = tmp;
        }
      } else if (endPos[axis] < -this._overlapSize[axis]) {
        halfSize = this.getLoopPartSize(2, axis);
        tmp = this._tweenStart[axis] + halfSize;
        if (tmp <= 0 && tmp >= -this._overlapSize[axis]) {
          endPos[axis] += halfSize;
          this._tweenStart[axis] = tmp;
        }
      }
    }
    loopCheckingNewPos(value, axis) {
      if (this._overlapSize[axis] == 0)
        return value;
      let pos = axis == "x" ? this._xPos : this._yPos;
      let changed = false;
      let v;
      if (value < 1e-3) {
        value += this.getLoopPartSize(2, axis);
        if (value > pos) {
          v = this.getLoopPartSize(6, axis);
          v = Math.ceil((value - pos) / v) * v;
          pos = clamp(pos + v, 0, this._overlapSize[axis]);
          changed = true;
        }
      } else if (value >= this._overlapSize[axis]) {
        value -= this.getLoopPartSize(2, axis);
        if (value < pos) {
          v = this.getLoopPartSize(6, axis);
          v = Math.ceil((pos - value) / v) * v;
          pos = clamp(pos - v, 0, this._overlapSize[axis]);
          changed = true;
        }
      }
      if (changed) {
        if (axis == "x")
          this._container.x = -Math.floor(pos);
        else
          this._container.y = -Math.floor(pos);
      }
      return value;
    }
    alignPosition(pos, inertialScrolling) {
      if (this._pageMode) {
        pos.x = this.alignByPage(pos.x, "x", inertialScrolling);
        pos.y = this.alignByPage(pos.y, "y", inertialScrolling);
      } else if (this._snapToItem) {
        let xDir = 0;
        let yDir = 0;
        if (inertialScrolling) {
          xDir = pos.x - this._containerPos.x;
          yDir = pos.y - this._containerPos.y;
        }
        let pt = this._layout.getSnappingPosition(-pos.x, -pos.y, xDir, yDir, s_vec24);
        if (pos.x < 0 && pos.x > -this._overlapSize.x)
          pos.x = -pt.x;
        if (pos.y < 0 && pos.y > -this._overlapSize.y)
          pos.y = -pt.y;
      }
    }
    alignByPage(pos, axis, inertialScrolling) {
      let page;
      if (pos > 0)
        page = 0;
      else if (pos < -this._overlapSize[axis])
        page = Math.ceil(this._contentSize[axis] / this._pageSize[axis]) - 1;
      else {
        page = Math.floor(-pos / this._pageSize[axis]);
        let change = inertialScrolling ? pos - this._containerPos[axis] : pos - this._container[axis];
        let testPageSize = Math.min(this._pageSize[axis], this._contentSize[axis] - (page + 1) * this._pageSize[axis]);
        let delta = -pos - page * this._pageSize[axis];
        if (Math.abs(change) > this._pageSize[axis]) {
          if (delta > testPageSize * 0.5)
            page++;
        } else {
          if (delta > testPageSize * (change < 0 ? UIConfig.defaultScrollPagingThreshold : 1 - UIConfig.defaultScrollPagingThreshold))
            page++;
        }
        pos = -page * this._pageSize[axis];
        if (pos < -this._overlapSize[axis])
          pos = -this._overlapSize[axis];
      }
      if (inertialScrolling) {
        let oldPos = this._tweenStart[axis];
        let oldPage;
        if (oldPos > 0)
          oldPage = 0;
        else if (oldPos < -this._overlapSize[axis])
          oldPage = Math.ceil(this._contentSize[axis] / this._pageSize[axis]) - 1;
        else
          oldPage = Math.floor(-oldPos / this._pageSize[axis]);
        let startPage = Math.floor(-this._containerPos[axis] / this._pageSize[axis]);
        if (Math.abs(page - startPage) > 1 && Math.abs(oldPage - startPage) <= 1) {
          if (page > startPage)
            page = startPage + 1;
          else
            page = startPage - 1;
          pos = -page * this._pageSize[axis];
        }
      }
      return pos;
    }
    updateTargetAndDuration(orignPos, resultPos) {
      resultPos.x = this.updateTargetAndDuration2(orignPos.x, "x");
      resultPos.y = this.updateTargetAndDuration2(orignPos.y, "y");
    }
    updateTargetAndDuration2(pos, axis) {
      let v = this._velocity[axis];
      let duration = 0;
      if (pos > 0)
        pos = 0;
      else if (pos < -this._overlapSize[axis])
        pos = -this._overlapSize[axis];
      else {
        let v2 = Math.abs(v) * this._velocityScale;
        let touchScreen = this._owner.findRoot().inputMgr.touchScreen;
        if (touchScreen)
          v2 *= 1136 / Math.max(window.screen.width, window.screen.height);
        let ratio = 0;
        if (this._pageMode || !touchScreen) {
          if (v2 > 500)
            ratio = Math.pow((v2 - 500) / 500, 2);
        } else {
          if (v2 > 1e3)
            ratio = Math.pow((v2 - 1e3) / 1e3, 2);
        }
        if (ratio != 0) {
          if (ratio > 1)
            ratio = 1;
          v2 *= ratio;
          v *= ratio;
          this._velocity[axis] = v;
          duration = Math.log(60 / v2) / Math.log(this._decelerationRate) / 60;
          let change = Math.floor(v * duration * 0.4);
          pos += change;
        }
      }
      if (duration < TWEEN_TIME_DEFAULT)
        duration = TWEEN_TIME_DEFAULT;
      this._tweenDuration[axis] = duration;
      return pos;
    }
    fixDuration(axis, oldChange) {
      if (this._tweenChange[axis] == 0 || Math.abs(this._tweenChange[axis]) >= Math.abs(oldChange))
        return;
      let newDuration = Math.abs(this._tweenChange[axis] / oldChange) * this._tweenDuration[axis];
      if (newDuration < TWEEN_TIME_DEFAULT)
        newDuration = TWEEN_TIME_DEFAULT;
      this._tweenDuration[axis] = newDuration;
    }
    startTween(type) {
      this._tweenTime.set(0, 0);
      this._tweening = type;
      Timers.addUpdate(this.tweenUpdate, this);
      this._updateScrollBarVisible();
    }
    killTween() {
      if (this._tweening == 1) {
        this._container.setPos(this._tweenStart.x + this._tweenChange.x, this._tweenStart.y + this._tweenChange.y);
        this._owner.emit("scroll");
      }
      this._tweening = 0;
      Timers.remove(this.tweenUpdate, this);
      this._updateScrollBarVisible();
      this._owner.emit("scroll_end");
    }
    checkRefreshBar() {
      if (this._header == null && this._footer == null)
        return;
      let pos = this._container[this._refreshBarAxis];
      if (this._header) {
        if (pos > 0) {
          if (!this._header.element.parentElement) {
            this._maskContainer.insertBefore(this._header.element, this._container);
            this._header._setParent(this._owner);
          }
          let pt = s_vec24;
          pt.set(this._header.width, this._header.height);
          pt[this._refreshBarAxis] = pos;
          this._header.setSize(pt.x, pt.y);
        } else {
          if (this._header.element.parentElement)
            this._maskContainer.removeChild(this._header.element);
        }
      }
      if (this._footer) {
        let max = this._overlapSize[this._refreshBarAxis];
        if (pos < -max || max == 0 && this._footerLockedSize > 0) {
          if (!this._footer.element.parentElement) {
            this._maskContainer.insertBefore(this._footer.element, this._container);
            this._footer._setParent(this._owner);
          }
          let pt = s_vec24;
          pt.set(this._footer.x, this._footer.y);
          if (max > 0)
            pt[this._refreshBarAxis] = pos + this._contentSize[this._refreshBarAxis];
          else
            pt[this._refreshBarAxis] = Math.max(
              Math.min(pos + this._viewSize[this._refreshBarAxis], this._viewSize[this._refreshBarAxis] - this._footerLockedSize),
              this._viewSize[this._refreshBarAxis] - this._contentSize[this._refreshBarAxis]
            );
          this._footer.setLeftTop(pt.x, pt.y);
          pt.set(this._footer.width, this._footer.height);
          if (max > 0)
            pt[this._refreshBarAxis] = -max - pos;
          else
            pt[this._refreshBarAxis] = this._viewSize[this._refreshBarAxis] - this._footer[this._refreshBarAxis];
          this._footer.setSize(pt.x, pt.y);
        } else {
          if (this._footer.element.parentElement)
            this._maskContainer.removeChild(this._footer.element);
        }
      }
    }
    tweenUpdate() {
      let nx = this.runTween("x");
      let ny = this.runTween("y");
      this._container.setPos(nx, ny);
      if (this._tweening == 2) {
        if (this._overlapSize.x > 0)
          this._xPos = clamp(-nx, 0, this._overlapSize.x);
        if (this._overlapSize.y > 0)
          this._yPos = clamp(-ny, 0, this._overlapSize.y);
      }
      if (this._tweenChange.x == 0 && this._tweenChange.y == 0) {
        this._tweening = 0;
        Timers.remove(this.tweenUpdate, this);
        this.loopCheckingCurrent();
        this.updateScrollBarPos();
        this._updateScrollBarVisible();
        this._owner.emit("scroll");
        this._owner.emit("scroll_end");
      } else {
        this.updateScrollBarPos();
        this._owner.emit("scroll");
      }
    }
    runTween(axis) {
      let newValue;
      if (this._tweenChange[axis] != 0) {
        this._tweenTime[axis] += Timers.deltaTime / 1e3;
        if (this._tweenTime[axis] >= this._tweenDuration[axis]) {
          newValue = this._tweenStart[axis] + this._tweenChange[axis];
          this._tweenChange[axis] = 0;
        } else {
          let ratio = easeFunc(this._tweenTime[axis], this._tweenDuration[axis]);
          newValue = this._tweenStart[axis] + Math.floor(this._tweenChange[axis] * ratio);
        }
        let threshold1 = 0;
        let threshold2 = -this._overlapSize[axis];
        if (this._headerLockedSize > 0 && this._refreshBarAxis == axis)
          threshold1 = this._headerLockedSize;
        if (this._footerLockedSize > 0 && this._refreshBarAxis == axis) {
          let max = this._overlapSize[this._refreshBarAxis];
          if (max == 0)
            max = Math.max(this._contentSize[this._refreshBarAxis] + this._footerLockedSize - this._viewSize[this._refreshBarAxis], 0);
          else
            max += this._footerLockedSize;
          threshold2 = -max;
        }
        if (this._tweening == 2 && this._bouncebackEffect) {
          if (newValue > 20 + threshold1 && this._tweenChange[axis] > 0 || newValue > threshold1 && this._tweenChange[axis] == 0) {
            this._tweenTime[axis] = 0;
            this._tweenDuration[axis] = TWEEN_TIME_DEFAULT;
            this._tweenChange[axis] = -newValue + threshold1;
            this._tweenStart[axis] = newValue;
          } else if (newValue < threshold2 - 20 && this._tweenChange[axis] < 0 || newValue < threshold2 && this._tweenChange[axis] == 0) {
            this._tweenTime[axis] = 0;
            this._tweenDuration[axis] = TWEEN_TIME_DEFAULT;
            this._tweenChange[axis] = threshold2 - newValue;
            this._tweenStart[axis] = newValue;
          }
        } else {
          if (newValue > threshold1) {
            newValue = threshold1;
            this._tweenChange[axis] = 0;
          } else if (newValue < threshold2) {
            newValue = threshold2;
            this._tweenChange[axis] = 0;
          }
        }
      } else
        newValue = this._container[axis];
      return newValue;
    }
  };
  function easeFunc(t, d) {
    return (t = t / d - 1) * t * t + 1;
  }

  // src/ui/ScrollBar.ts
  var MIN_GRIP_SIZE = 20;
  var ScrollBar = class extends Widget {
    constructor() {
      super();
      this._scrollPerc = 0;
      this._fixedGripSize = false;
      this._scrollingDir = 0;
      this._dragOffset = new Vec2();
      this.on("pointer_down", this._barTouchBegin, this);
      this.on("pointer_up", this._barTouchEnd, this);
    }
    setOwner(target, vertical) {
      this._target = target;
      this._vertical = vertical;
    }
    setDisplayPerc(value) {
      if (this._vertical) {
        if (!this._fixedGripSize)
          this._gripButton.height = Math.max(Math.floor(value * this._bar.height), Math.min(MIN_GRIP_SIZE, this._bar.height));
        this._gripButton.y = this._bar.y + (this._bar.height - this._gripButton.height) * this._scrollPerc;
      } else {
        if (!this._fixedGripSize)
          this._gripButton.width = Math.max(Math.floor(value * this._bar.width), Math.min(MIN_GRIP_SIZE, this._bar.width));
        this._gripButton.x = this._bar.x + (this._bar.width - this._gripButton.width) * this._scrollPerc;
      }
      this._gripButton.visible = value != 0 && value != 1;
    }
    setScrollPerc(val) {
      this._scrollPerc = val;
      if (this._vertical)
        this._gripButton.y = this._bar.y + (this._bar.height - this._gripButton.height) * this._scrollPerc;
      else
        this._gripButton.x = this._bar.x + (this._bar.width - this._gripButton.width) * this._scrollPerc;
    }
    get minSize() {
      if (this._vertical)
        return (this._arrowButton1 ? this._arrowButton1.height : 0) + (this._arrowButton2 ? this._arrowButton2.height : 0);
      else
        return (this._arrowButton1 ? this._arrowButton1.width : 0) + (this._arrowButton2 ? this._arrowButton2.width : 0);
    }
    get gripDragging() {
      return this._gripDragging;
    }
    get fixedGripSize() {
      return this._fixedGripSize;
    }
    set fixedGripSize(value) {
      this._fixedGripSize = value;
    }
    /** @internal */
    _onConstruct(inPrefab) {
      if (this._gripButton) {
        this._gripButton.on("pointer_down", this._gripTouchBegin, this);
        this._gripButton.on("pointer_move", this._gripTouchMove, this);
        this._gripButton.on("pointer_up", this._gripTouchEnd, this);
      }
      if (this._arrowButton1)
        this._arrowButton1.on("pointer_down", this._arrowButton1Click, this);
      if (this._arrowButton2)
        this._arrowButton2.on("pointer_down", this._arrowButton2Click, this);
      super._onConstruct(inPrefab);
    }
    _gripTouchBegin(evt) {
      if (!this._bar)
        return;
      evt.stopPropagation();
      evt.capturePointer();
      this.startDragGrip(evt.input.x, evt.input.y);
    }
    startDragGrip(x, y) {
      this._gripDragging = true;
      this._target._updateScrollBarVisible();
      this.globalToLocal(x, y, this._dragOffset);
      this._dragOffset.x -= this._gripButton.x;
      this._dragOffset.y -= this._gripButton.y;
    }
    _gripTouchMove(evt) {
      if (!this.onStage)
        return;
      let pt = this.globalToLocal(evt.input.x, evt.input.y, s_vec25);
      if (this._vertical) {
        let curY = pt.y - this._dragOffset.y;
        let diff = this._bar.height - this._gripButton.height;
        if (diff == 0)
          this._target.percY = 0;
        else
          this._target.percY = (curY - this._bar.y) / diff;
      } else {
        let curX = pt.x - this._dragOffset.x;
        let diff = this._bar.width - this._gripButton.width;
        if (diff == 0)
          this._target.percX = 0;
        else
          this._target.percX = (curX - this._bar.x) / (this._bar.width - this._gripButton.width);
      }
    }
    _gripTouchEnd(evt) {
      this._gripDragging = false;
      this._target._updateScrollBarVisible();
    }
    _arrowButton1Click(evt) {
      evt.stopPropagation();
      if (this._vertical)
        this._target.scrollUp();
      else
        this._target.scrollLeft();
    }
    _arrowButton2Click(evt) {
      evt.stopPropagation();
      if (this._vertical)
        this._target.scrollDown();
      else
        this._target.scrollRight();
    }
    _barTouchBegin(evt) {
      evt.stopPropagation();
      evt.capturePointer();
      this._scrollingDir = null;
      this.doBarScroll();
    }
    doBarScroll() {
      if (this.destroyed)
        return;
      let root = this.findRoot();
      let pt = this._gripButton.globalToLocal(root.pointerPos.x, root.pointerPos.y, s_vec25);
      let dir = -1;
      if (this._vertical) {
        if (pt.y < 0)
          dir = 0;
        else if (pt.y > this._gripButton.height)
          dir = 1;
      } else {
        if (pt.x < 0)
          dir = 2;
        else if (pt.x > this._gripButton.width)
          dir = 3;
      }
      if (dir === -1) {
        root.inputMgr.addCaptor(-1, this._gripButton);
        this.startDragGrip(root.pointerPos.x, root.pointerPos.y);
        return;
      }
      if (this._scrollingDir == null)
        this._scrollingDir = dir;
      else if (this._scrollingDir !== dir)
        return;
      switch (dir) {
        case 0:
          this._target.scrollUp(4);
          break;
        case 1:
          this._target.scrollDown(4);
          break;
        case 2:
          this._target.scrollLeft(4);
          break;
        case 3:
          this._target.scrollRight(4);
          break;
      }
      Timers.add(250, 1, this.doBarScroll, this);
    }
    _barTouchEnd() {
      Timers.remove(this.doBarScroll, this);
    }
  };
  var s_vec25 = new Vec2();

  // src/ui/ProgressBar.ts
  var ProgressBar = class extends Widget {
    constructor() {
      super();
      this._min = 0;
      this._max = 0;
      this._value = 0;
      this._titleType = 0;
      this._reverse = false;
      this._barMaxWidthDelta = 0;
      this._barMaxHeightDelta = 0;
      this._barStartX = 0;
      this._barStartY = 0;
      this._value = 50;
      this._max = 100;
    }
    get titleType() {
      return this._titleType;
    }
    set titleType(value) {
      if (this._titleType != value) {
        this._titleType = value;
        this.update(null, true);
      }
    }
    get min() {
      return this._min;
    }
    set min(value) {
      if (this._min != value) {
        this._min = value;
        this.update(null, true);
      }
    }
    get max() {
      return this._max;
    }
    set max(value) {
      if (this._max != value) {
        this._max = value;
        this.update(null, true);
      }
    }
    get value() {
      return this._value;
    }
    set value(value) {
      if (this._value != value) {
        Tween.kill(this, false, this.update);
        this._value = value;
        this.update(null, true);
      }
    }
    get hBar() {
      return this._hBar;
    }
    set hBar(value) {
      this._hBar = value;
      this._value = this._max;
      this._barStartX = 0;
      this.update(null, false);
    }
    get vBar() {
      return this._vBar;
    }
    set vBar(value) {
      this._vBar = value;
      this._value = this._max;
      this._barStartY = 0;
      this.update(null, false);
    }
    get titleWidget() {
      return this._titleWidget;
    }
    set titleWidget(value) {
      this._titleWidget = value;
      this.update(null, false);
    }
    get reverse() {
      return this._reverse;
    }
    set reverse(value) {
      this._reverse = value;
      this.update(null, false);
    }
    tweenValue(value, duration) {
      let oldValule;
      let tweener = Tween.getTween(this, this.update);
      if (tweener) {
        oldValule = tweener.value.x;
        tweener.kill();
      } else
        oldValule = this._value;
      this._value = value;
      return Tween.to(oldValule, this._value, duration).setTarget(this, this.update).setEase(0 /* Linear */);
    }
    update(newValue, delay) {
      if (this._getBit(NodeFlags.EDITING_ROOT_NODE)) {
        this.updateTitle(this._max, this._max, 1);
        return;
      }
      if (newValue == null && delay === true) {
        Timers.callLater(this.update, this);
        return;
      }
      if (newValue == null)
        newValue = this._value;
      let percent = clamp01((newValue - this._min) / (this._max - this._min));
      this.updateTitle(newValue, this._max, percent);
      let fullWidth = this.width - this._barMaxWidthDelta;
      let fullHeight = this.height - this._barMaxHeightDelta;
      if (!this._reverse) {
        if (this._hBar) {
          if (!this.setFillAmount(this._hBar, percent))
            this._hBar.width = Math.round(fullWidth * percent);
        }
        if (this._vBar) {
          if (!this.setFillAmount(this._vBar, percent))
            this._vBar.height = Math.round(fullHeight * percent);
        }
      } else {
        if (this._hBar) {
          if (!this.setFillAmount(this._hBar, 1 - percent)) {
            this._hBar.width = Math.round(fullWidth * percent);
            this._hBar.x = this._barStartX + (fullWidth - this._hBar.width);
          }
        }
        if (this._vBar) {
          if (!this.setFillAmount(this._vBar, 1 - percent)) {
            this._vBar.height = Math.round(fullHeight * percent);
            this._vBar.y = this._barStartY + (fullHeight - this._vBar.height);
          }
        }
      }
    }
    updateTitle(value, max, percent) {
      let obj = this._titleWidget;
      if (!obj)
        return;
      switch (this._titleType) {
        case 0 /* Percent */:
          obj.text = Math.floor(percent * 100) + "%";
          break;
        case 1 /* ValueAndMax */:
          obj.text = Math.floor(value) + "/" + Math.floor(max);
          break;
        case 2 /* Value */:
          obj.text = "" + Math.floor(value);
          break;
        case 3 /* Max */:
          obj.text = "" + Math.floor(max);
          break;
      }
    }
    setFillAmount(bar, amount) {
      return false;
    }
    /** @internal */
    _onConstruct(inPrefab) {
      if (this._hBar) {
        this._barMaxWidthDelta = this.width - this._hBar.width;
        this._barStartX = this._hBar.x;
      }
      if (this._vBar) {
        this._barMaxHeightDelta = this.height - this._vBar.height;
        this._barStartY = this._vBar.y;
      }
      Timers.runCallLater(this.update, this);
      super._onConstruct(inPrefab);
    }
    _sizeChanged() {
      super._sizeChanged();
      this.update(null, true);
    }
  };

  // src/event/InputManager.ts
  var InputManager = class {
    constructor(root) {
      this._pointers = [];
      this._pointerPos = new Vec2();
      this._touchCount = 0;
      this._rollOverChain = [];
      this._rollOutChain = [];
      this._focusOutChain = [];
      this._focusInChain = [];
      this._focusHistory = [];
      this._root = root;
      let win = root.window;
      this.touchScreen = "ontouchstart" in win || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
      this.electron = window && window.process && window.process.versions["electron"] != void 0;
      for (let i = 0; i < maxPointer; i++)
        this._pointers.push(new PointerInfo());
      let doc = win.document;
      doc.addEventListener("pointerdown", (ev) => this.handlePointer(ev, 0), { passive: false });
      doc.addEventListener("pointerup", (ev) => this.handlePointer(ev, 1), { passive: false });
      doc.addEventListener("pointermove", (ev) => this.handlePointer(ev, 2), { passive: false });
      doc.addEventListener("pointercancel", (ev) => this.handlePointer(ev, 3), { passive: false });
      doc.addEventListener("pointerleave", (ev) => this.handlePointer(ev, 3), { passive: false });
      doc.addEventListener("contextmenu", (ev) => this.handleContextMenu(ev));
      doc.addEventListener("dragstart", (ev) => this._dragging = true);
      doc.addEventListener("dragend", (ev) => this.handlePointer(ev, 1), { passive: false });
      doc.addEventListener("dragover", (ev) => this.handlePointer(ev, 2), { passive: false });
      doc.addEventListener("wheel", (ev) => this.handleWheel(ev), { passive: false });
      win.addEventListener("keydown", this.onKeydown.bind(this));
      win.addEventListener("keyup", this.onKeyup.bind(this));
      win.addEventListener("blur", this.onWindowBlur.bind(this));
      Timers.addUpdate(this.checkNextFocus, this);
    }
    get pointerPos() {
      return this._pointerPos;
    }
    get touchTarget() {
      return this._touchTarget;
    }
    get touchCount() {
      return this._touchCount;
    }
    getPointerPos(pointerId, out) {
      if (!out)
        out = new Vec2();
      if (pointerId == null || pointerId === -1)
        out.copy(this._pointerPos);
      else {
        let pointer = this.getPointer(pointerId);
        if (pointer)
          out.set(pointer.x, pointer.y);
        else
          out.copy(this._pointerPos);
      }
      return out;
    }
    addCaptor(pointerId, target) {
      if (pointerId == null || pointerId === -1)
        pointerId = this._lastPointerId;
      let pointer = this.getPointer(pointerId);
      if (pointer.captors.indexOf(target) === -1)
        pointer.captors.push(target);
    }
    removeCaptor(target) {
      for (let j = 0; j < maxPointer; j++) {
        let pointer = this._pointers[j];
        let i = pointer.captors.indexOf(target);
        if (i != -1) {
          pointer.captors[i] = null;
        }
      }
    }
    cancelClick(pointerId) {
      if (pointerId == null)
        pointerId = this._lastPointerId;
      for (let j = 0; j < maxPointer; j++) {
        let pointer = this._pointers[j];
        if (pointer.pointerId === pointerId)
          pointer.clickCancelled = true;
      }
    }
    getLastPressedKey(timeThreshold) {
      let i = Event._lastInput;
      if (timeThreshold != null && performance.now() - i.keyTimestamp > timeThreshold)
        return null;
      return i.key;
    }
    //Key handle -----------------
    onKeydown(ev) {
      this.setLastInput(ev);
      let htmlTarget = ev.target;
      if (htmlTarget.shadowRoot)
        htmlTarget = ev.composedPath()[0];
      let f = this.focus;
      if (f)
        f.bubbleEvent("key_down", null, null, htmlTarget);
      else
        this._root.emit("key_down", null, ev, htmlTarget);
    }
    onKeyup(ev) {
      this.setLastInput(ev);
      let htmlTarget = ev.target;
      if (htmlTarget.shadowRoot)
        htmlTarget = ev.composedPath()[0];
      let f = this.focus;
      if (f)
        f.bubbleEvent("key_up", null, null, htmlTarget);
      else
        this._root.emit("key_up", null, ev, htmlTarget);
    }
    setLastInput(ev) {
      let i = Event._lastInput;
      i.altKey = ev.altKey;
      i.ctrlKey = ev.ctrlKey;
      i.shiftKey = ev.shiftKey;
      i.commandKey = ev.metaKey;
      i.keyCode = ev.code;
      i.key = ev.key;
      i.repeat = ev.repeat;
      i.button = 0;
      i.holdTime = 0;
      i.clickCount = 0;
      i.mouseWheelDelta = 0;
      i.keyTimestamp = performance.now();
    }
    //Mouse/Touch Handle -----------------
    /** @internal */
    _getEventTarget(ev, type) {
      let ele = ev.target;
      if (ele.shadowRoot) {
        let path = ev.composedPath();
        for (let i = 0; i < path.length; i++) {
          let node = path[i];
          if (node.owner)
            return node.owner;
        }
      }
      while (ele) {
        let t = ele.owner;
        if (t)
          return t;
        ele = ele.parentElement;
      }
      return this._root;
    }
    handlePointer(ev, type) {
      let htmlTarget = ev.target;
      if (htmlTarget.shadowRoot)
        htmlTarget = ev.composedPath()[0];
      this._pointerPos.set(ev.pageX, ev.pageY);
      this._lastPointerId = ev.pointerId ?? this._lastPointerId;
      if (type === 1)
        this._dragging = false;
      let pointer;
      let free;
      for (let j = 0; j < maxPointer; j++) {
        if (this._pointers[j].pointerId === this._lastPointerId) {
          pointer = this._pointers[j];
          break;
        }
        if (this._pointers[j].pointerId === -1)
          free = this._pointers[j];
      }
      if (!pointer) {
        if (type === 1 || type === 3)
          return;
        pointer = free;
        if (!pointer)
          return;
        pointer.pointerId = this._lastPointerId;
      }
      if (type === 2 && pointer.began && ev.pointerType === "mouse" && (ev.buttons & getMouseButtonMask(pointer.button)) === 0) {
        type = 3;
        this._dragging = false;
      }
      pointer.shiftKey = ev.shiftKey;
      pointer.altKey = ev.altKey;
      pointer.ctrlKey = ev.ctrlKey;
      pointer.commandKey = ev.metaKey;
      pointer.target = this._touchTarget = this._getEventTarget(ev, type);
      if (this._pointerPos.x !== pointer.x || this._pointerPos.y !== pointer.y) {
        pointer.x = this._pointerPos.x;
        pointer.y = this._pointerPos.y;
        if (pointer.began)
          pointer.holdTime = Timers.frameCount - pointer.downFrame === 1 ? 1 / 60 : (performance.now() - pointer.downTime) / 1e3;
        if (type === 2) {
          this.setLastPointer(pointer);
          if (Math.abs(pointer.x - pointer.downX) > 50 || Math.abs(pointer.y - pointer.downY) > 50)
            pointer.clickCancelled = true;
          if (pointer.captors.length > 0) {
            for (let i = 0, n = pointer.captors.length; i < n; i++) {
              let e = pointer.captors[i];
              if (e instanceof Widget && !e.onStage)
                pointer.captors[i] = null;
            }
            this._root.bubbleEvent("pointer_move", null, pointer.target, htmlTarget, pointer.captors);
          } else {
            let p = pointer.target;
            while (p) {
              if (p._getBit(NodeFlags.ALWASY_EMIT_MOUSE_MOVE_EVENT)) {
                if (p == this._root)
                  p.emit("pointer_move", null, ev, htmlTarget);
                else {
                  p.globalToLocal(pointer.x, pointer.y, s_vec26);
                  if (s_vec26.x >= 0 && s_vec26.y >= 0 && s_vec26.x < p.width && s_vec26.y < p.height)
                    p.emit("pointer_move", null, ev, htmlTarget);
                }
              }
              p = p.findParent();
            }
          }
        }
      }
      if (pointer.lastRollOver != pointer.target)
        this.handleRollOver(pointer);
      if (type === 0) {
        if (!pointer.began) {
          this._touchCount++;
          anyPointerInput++;
          pointer.began = true;
          pointer.clickCancelled = false;
          pointer.downX = pointer.x;
          pointer.downY = pointer.y;
          pointer.downTime = performance.now();
          pointer.downFrame = Timers.frameCount;
          pointer.holdTime = 0;
          pointer.button = ev.button;
          pointer.downTargets.length = 0;
          if (pointer.target) {
            let p = pointer.target;
            while (p) {
              pointer.downTargets.push(p);
              p = p.findParent();
            }
          }
          this.setFocus(pointer.target);
          this.setLastPointer(pointer);
          pointer.target.bubbleEvent("pointer_down", null, null, htmlTarget);
        }
      } else if (type === 1 || type === 3) {
        if (pointer.began) {
          this._touchCount--;
          anyPointerInput--;
          pointer.began = false;
          let now = performance.now();
          if (pointer.downTargets.length === 0 || pointer.clickCancelled || Math.abs(pointer.x - pointer.downX) > clickTestThreshold || Math.abs(pointer.y - pointer.downY) > clickTestThreshold) {
            pointer.clickCancelled = true;
            pointer.lastClickTime = 0;
            pointer.clickCount = 1;
          } else {
            if (now - pointer.lastClickTime < 350 && Math.abs(pointer.x - pointer.lastClickX) < clickTestThreshold && Math.abs(pointer.y - pointer.lastClickY) < clickTestThreshold && pointer.lastClickButton === pointer.button) {
              if (pointer.clickCount === 2)
                pointer.clickCount = 1;
              else
                pointer.clickCount++;
            } else
              pointer.clickCount = 1;
            pointer.lastClickTime = now;
            pointer.lastClickX = pointer.x;
            pointer.lastClickY = pointer.y;
            pointer.lastClickButton = pointer.button;
          }
          pointer.holdTime = Timers.frameCount - pointer.downFrame === 1 ? 1 / 60 : (now - pointer.downTime) / 1e3;
          this.setLastPointer(pointer);
          let bubbleFrom = pointer.target ? pointer.target : this._root;
          if (pointer.captors.length > 0) {
            for (let i = 0, n = pointer.captors.length; i < n; i++) {
              let e = pointer.captors[i];
              if (e instanceof Widget) {
                if (!e.onStage)
                  pointer.captors[i] = null;
              }
            }
            bubbleFrom.bubbleEvent("pointer_up", null, null, htmlTarget, pointer.captors);
            pointer.captors.length = 0;
          } else
            bubbleFrom.bubbleEvent("pointer_up", null, null, htmlTarget);
          if (type != 3) {
            let clickTarget = this.clickTest(pointer);
            if (clickTarget) {
              this.setLastPointer(pointer);
              if (ev.button === 1 || ev.button === 2)
                clickTarget.bubbleEvent("right_click", null, pointer.target, htmlTarget);
              else
                clickTarget.bubbleEvent("click", null, pointer.target, htmlTarget);
            }
          }
          pointer.button = -1;
          if (ev.pointerType != "mouse") {
            pointer.target = null;
            this.handleRollOver(pointer);
            pointer.pointerId = -1;
          }
          if (this._nextCursor != null) {
            this._root.element.style.cursor = this._nextCursor;
            this._nextCursor = null;
          }
        }
      }
    }
    clickTest(pointer) {
      if (pointer.clickCancelled) {
        pointer.downTargets.length = 0;
        return null;
      }
      let obj = pointer.downTargets[0];
      if (obj.onStage) {
        pointer.downTargets.length = 0;
        return obj;
      }
      obj = pointer.target;
      while (obj) {
        let i = pointer.downTargets.indexOf(obj);
        if (i != -1 && obj.onStage)
          break;
        obj = obj.findParent();
      }
      pointer.downTargets.length = 0;
      return obj;
    }
    handleWheel(ev) {
      if (ev.deltaY === 0)
        return;
      let htmlTarget = ev.target;
      if (htmlTarget.shadowRoot)
        htmlTarget = ev.composedPath()[0];
      this._pointerPos.set(ev.pageX, ev.pageY);
      let pointer = this.getPointer(-1);
      if (!pointer)
        pointer = this._pointers[0];
      pointer.target = this._touchTarget = this._getEventTarget(ev, 4);
      pointer.shiftKey = ev.shiftKey;
      pointer.altKey = ev.altKey;
      pointer.ctrlKey = ev.ctrlKey;
      pointer.commandKey = ev.metaKey;
      pointer.mouseWheelDelta = ev.deltaY;
      this.setLastPointer(pointer);
      this._touchTarget.bubbleEvent("mouse_wheel", null, null, htmlTarget);
      pointer.mouseWheelDelta = 0;
    }
    handleContextMenu(ev) {
      let target = ev.target;
      if (target.shadowRoot && ev.composedPath)
        target = ev.composedPath()[0];
      let isInput = target instanceof HTMLInputElement && (target.type == "text" || target.type == "password") || target instanceof HTMLTextAreaElement;
      if (this.electron || !isInput)
        ev.preventDefault();
    }
    getPointer(pointerId) {
      for (let j = 0; j < maxPointer; j++) {
        let pointer = this._pointers[j];
        if (pointerId === -1 && pointer.pointerId !== -1 || pointerId !== -1 && pointer.pointerId === pointerId)
          return pointer;
      }
      return null;
    }
    handleRollOver(pointer) {
      this._rollOverChain.length = 0;
      this._rollOutChain.length = 0;
      let obj = pointer.lastRollOver;
      while (obj) {
        this._rollOutChain.push(obj);
        obj = obj.findParent();
      }
      pointer.lastRollOver = pointer.target;
      obj = pointer.target;
      while (obj) {
        let i = this._rollOutChain.indexOf(obj);
        if (i !== -1) {
          this._rollOutChain.splice(i, this._rollOutChain.length - i);
          break;
        }
        this._rollOverChain.push(obj);
        obj = obj.findParent();
      }
      let cnt = this._rollOutChain.length;
      if (cnt > 0) {
        for (let i = 0; i < cnt; i++) {
          let obj2 = this._rollOutChain[i];
          if (obj2.onStage)
            obj2.emit("roll_out");
        }
        this._rollOutChain.length = 0;
      }
      cnt = this._rollOverChain.length;
      if (cnt > 0) {
        for (let i = 0; i < cnt; i++) {
          let obj2 = this._rollOverChain[i];
          if (obj2.onStage)
            obj2.emit("roll_over");
        }
        this._rollOverChain.length = 0;
      }
      ;
      let style = this._root.element.style;
      let cursor = null;
      obj = pointer.target;
      while (obj) {
        if (obj.cursor) {
          cursor = obj.cursor;
          break;
        }
        obj = obj.parent;
      }
      if (cursor == null)
        cursor = "";
      let oldCursor = style.cursor ?? "";
      if (pointer.began) {
        if (oldCursor != cursor)
          this._nextCursor = cursor;
        else
          this._nextCursor = null;
      } else {
        this._nextCursor = null;
        if (oldCursor != cursor && !this._dragging)
          style.cursor = cursor;
      }
    }
    setLastPointer(pointer) {
      let i = Event._lastInput;
      i.pointerId = pointer.pointerId;
      i.x = pointer.x;
      i.y = pointer.y;
      i.clickCount = pointer.clickCount;
      i.mouseWheelDelta = pointer.mouseWheelDelta;
      i.button = pointer.button;
      i.holdTime = pointer.holdTime;
      i.altKey = pointer.altKey;
      i.ctrlKey = pointer.ctrlKey;
      i.shiftKey = pointer.shiftKey;
      i.commandKey = pointer.commandKey;
      i.keyTimestamp = 0;
    }
    onClickLink(event, href) {
      let e = event.currentTarget;
      while (e) {
        let o = e.owner;
        if (o) {
          o.bubbleEvent("click_link", href);
          break;
        }
        e = e.parentElement;
      }
    }
    //Focus Manage -----------------
    get focus() {
      if (this._focus != null) {
        if (!this._focus.onStage)
          this._focus = null;
      } else {
        this.checkNextFocus();
      }
      return this._focus;
    }
    validateFocus(container, child) {
      if (child == this._focus || child.isAncestorOf(this._focus))
        this.onFocusRemoving(container);
    }
    setFocus(newFocus) {
      if (newFocus == this._root)
        newFocus = null;
      this._nextFocus = null;
      if (this._focus == newFocus)
        return;
      let navRoot = null;
      let element = newFocus;
      while (element != null) {
        if (!element.focusable)
          return;
        else if (element.tabStopChildren) {
          if (navRoot == null)
            navRoot = element;
        }
        element = element.findParent();
      }
      let oldFocus = this._focus;
      this._focus = newFocus;
      if (navRoot != null) {
        navRoot[lastFocus] = this._focus;
        let pos = this._focusHistory.indexOf(navRoot);
        if (pos != -1) {
          if (pos < this._focusHistory.length - 1)
            this._focusHistory.splice(pos + 1, this._focusHistory.length - pos - 1);
        } else {
          this._focusHistory.push(navRoot);
          if (this._focusHistory.length > 10)
            this._focusHistory.shift();
        }
      }
      this._focusInChain.length = 0;
      this._focusOutChain.length = 0;
      element = oldFocus;
      while (element != null) {
        if (element.focusable)
          this._focusOutChain.push(element);
        element = element.findParent();
      }
      element = this._focus;
      let i;
      while (element != null) {
        i = this._focusOutChain.indexOf(element);
        if (i != -1) {
          this._focusOutChain.splice(i, this._focusOutChain.length - i);
          break;
        }
        if (element.focusable)
          this._focusInChain.push(element);
        element = element.findParent();
      }
      let cnt = this._focusOutChain.length;
      if (cnt > 0) {
        for (i = 0; i < cnt; i++) {
          element = this._focusOutChain[i];
          if (element.onStage) {
            element.emit("focus_out");
            if (this._focus != newFocus)
              return;
          }
        }
        this._focusOutChain.length = 0;
      }
      cnt = this._focusInChain.length;
      if (cnt > 0) {
        for (i = 0; i < cnt; i++) {
          element = this._focusInChain[i];
          if (element.onStage) {
            element.emit("focus_in");
            if (this._focus != newFocus)
              return;
          }
        }
        this._focusInChain.length = 0;
      }
    }
    onFocusRemoving(sender) {
      this._nextFocus = sender;
      if (this._focusHistory.length > 0) {
        let i = this._focusHistory.length - 1;
        let test = this._focusHistory[i];
        let element = this._focus;
        while (element != null && element != sender) {
          if (element.tabStopChildren && element == test) {
            i--;
            if (i < 0)
              break;
            test = this._focusHistory[i];
          }
          element = element.findParent();
        }
        if (i != this._focusHistory.length - 1) {
          this._focusHistory.splice(i + 1, this._focusHistory.length - i - 1);
          if (this._focusHistory.length > 0)
            this._nextFocus = this._focusHistory[this._focusHistory.length - 1];
        }
      }
      this._focus = null;
    }
    checkNextFocus() {
      if (this._nextFocus != null) {
        let nextFocus = this._nextFocus;
        this._nextFocus = null;
        if (nextFocus.onStage) {
          if (nextFocus.tabStopChildren) {
            if (nextFocus[lastFocus] != null && nextFocus.isAncestorOf(nextFocus[lastFocus]))
              this.setFocus(nextFocus[lastFocus]);
            else
              this.setFocus(nextFocus);
          } else
            this.setFocus(nextFocus);
        }
      }
    }
    onWindowBlur() {
      let pointer = this.getPointer(-1);
      if (pointer) {
        pointer.target = null;
        this.handleRollOver(pointer);
      }
    }
  };
  var clickTestThreshold = 10;
  var maxPointer = 10;
  function getMouseButtonMask(button) {
    if (button === 1)
      return 4;
    if (button === 2)
      return 2;
    return 1 << button;
  }
  var s_vec26 = new Vec2();
  var anyPointerInput = 0;
  var PointerInfo = class {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.pointerId = -1;
      this.clickCount = 0;
      this.mouseWheelDelta = 0;
      this.button = -1;
      this.shiftKey = false;
      this.altKey = false;
      this.ctrlKey = false;
      this.commandKey = false;
      this.downX = 0;
      this.downY = 0;
      this.downTime = 0;
      this.downFrame = 0;
      this.began = false;
      this.clickCancelled = false;
      this.lastClickTime = 0;
      this.lastClickX = 0;
      this.lastClickY = 0;
      this.lastClickButton = 0;
      this.holdTime = 0;
      this.target = null;
      this.downTargets = [];
      this.lastRollOver = null;
      this.captors = [];
    }
  };
  var lastFocus = Symbol();

  // src/ui/PopupManager.ts
  var popupTargetKey = Symbol("popupTarget");
  var PopupManager = class {
    constructor(owner) {
      this._owner = owner;
      this._popupStack = [];
      this._justClosedPopups = [];
      this._owner.on("pointer_down", this._touchBegin, this, true);
      this._owner.window.addEventListener("blur", () => this.checkPopups());
    }
    showPopup(popup, target, dir) {
      if (this._popupStack.length > 0) {
        let k = this._popupStack.indexOf(popup);
        if (k != -1) {
          for (let i = this._popupStack.length - 1; i >= k; i--)
            this._owner.removeChild(this._popupStack.pop());
        }
      }
      this._popupStack.push(popup);
      if (target) {
        let p = target;
        while (p) {
          if (p.parent == this._owner) {
            if (popup.zOrder < p.zOrder) {
              popup.zOrder = p.zOrder;
            }
            break;
          }
          p = p.parent;
        }
      }
      popup[popupTargetKey] = target;
      this._owner.addChild(popup);
      this._owner.adjustModalLayer();
      this.validatePopupPosition(popup, target, dir);
    }
    validatePopupPosition(popup, target, dir, offsetX, offsetY) {
      let pos;
      let sizeW = 0, sizeH = 0;
      if (offsetX == null)
        offsetX = 0;
      if (offsetY == null)
        offsetY = 0;
      if (target) {
        pos = target.localToRoot(0, 0);
        let size = target.localToRoot(target.width, target.height);
        sizeW = size.x - pos.x;
        sizeH = size.y - pos.y;
      } else {
        pos = this._owner.inputMgr.getPointerPos();
        pos = this._owner.globalToLocal(pos.x, pos.y);
      }
      let xx, yy;
      xx = pos.x + offsetX;
      if (xx + popup.width > this._owner.width)
        xx = pos.x + sizeW - popup.width - offsetX;
      yy = pos.y + sizeH + offsetY;
      if ((dir === void 0 || dir === 0 /* Auto */) && yy + popup.height > this._owner.height || dir === 1 /* Up */) {
        yy = pos.y - popup.height - offsetY - 1;
        if (yy < 0) {
          yy = 0;
          xx += sizeW / 2;
          if (xx + popup.width > this._owner.width)
            xx = this._owner.width - popup.width;
        }
      }
      popup.setPos(xx, yy);
    }
    togglePopup(popup, target, dir) {
      if (this._justClosedPopups.indexOf(popup) != -1)
        return false;
      this.showPopup(popup, target, dir);
      return true;
    }
    hidePopup(popup) {
      if (popup) {
        let k = this._popupStack.indexOf(popup);
        if (k != -1) {
          for (let i = this._popupStack.length - 1; i >= k; i--)
            this.closePopup(this._popupStack.pop());
        }
      } else {
        let cnt = this._popupStack.length;
        for (let i = cnt - 1; i >= 0; i--)
          this.closePopup(this._popupStack[i]);
        this._popupStack.length = 0;
      }
    }
    get hasAnyPopup() {
      return this._popupStack.length != 0;
    }
    isPopupJustClosed(popup) {
      return this._justClosedPopups.indexOf(popup) != -1;
    }
    closePopup(popup) {
      if (popup.parent) {
        if (popup instanceof Window)
          popup.hide();
        else
          this._owner.removeChild(popup);
      }
      let focus = popup[popupTargetKey];
      if (focus && !focus.destroyed && focus.onStage)
        this._owner.inputMgr.setFocus(focus);
    }
    showTooltips(msg, delay) {
      if (this._defaultTooltipWin == null) {
        if (!UIConfig.tooltipsWin) {
          console.warn("UIConfig.tooltipsWin not defined");
          return;
        }
        this._defaultTooltipWin = UIConfig.tooltipsWin.create();
        this._defaultTooltipWin.touchable = false;
      }
      this._defaultTooltipWin.text = msg;
      this.showTooltipsWin(this._defaultTooltipWin, delay);
    }
    showTooltipsWin(tooltipWin, delay) {
      this.hideTooltips();
      this._tooltipWin = tooltipWin;
      if (delay != null && delay != 0)
        Timers.callDelay(delay, this._doShowTooltips, this);
      else
        this._doShowTooltips();
    }
    _doShowTooltips() {
      if (this._tooltipWin == null)
        return;
      this.validatePopupPosition(this._tooltipWin, null, 0 /* Auto */, 10, 20);
      this._owner.addChild(this._tooltipWin);
    }
    hideTooltips() {
      if (this._tooltipWin) {
        if (this._tooltipWin.parent)
          this._owner.removeChild(this._tooltipWin);
        this._tooltipWin = null;
      }
    }
    checkPopups() {
      this._justClosedPopups.length = 0;
      if (this._popupStack.length > 0) {
        let gobj = this._owner.inputMgr.touchTarget;
        let handled = false;
        while (gobj) {
          let k = this._popupStack.indexOf(gobj);
          if (k != -1) {
            for (let i = this._popupStack.length - 1; i > k; i--) {
              let last = this._popupStack.length - 1;
              let popup = this._popupStack[last];
              this.closePopup(popup);
              this._justClosedPopups.push(popup);
              this._popupStack.splice(last, 1);
            }
            handled = true;
            break;
          }
          gobj = gobj.parent;
        }
        if (!handled) {
          for (let i = this._popupStack.length - 1; i >= 0; i--) {
            let popup = this._popupStack[i];
            this.closePopup(popup);
            this._justClosedPopups.push(popup);
            this._popupStack.splice(i, 1);
          }
        }
      }
    }
    _touchBegin() {
      if (this._tooltipWin)
        this.hideTooltips();
      this.checkPopups();
    }
  };

  // src/ui/GRoot.ts
  var GRoot = class _GRoot extends Widget {
    constructor(ownerWindow) {
      super();
      this._margin = [0, 0, 0, 0];
      this._setBit(NodeFlags.ACTIVE_INHIERARCHY, true);
      this._setBit(NodeFlags.ON_STAGE, true);
      this._setBit(NodeFlags.ALWASY_EMIT_MOUSE_MOVE_EVENT, true);
      if (!_GRoot._defaultRoot)
        _GRoot._defaultRoot = this;
      this._window = ownerWindow;
      this._window.GRootInst = this;
      UIElement.addStyles(this._window.document);
      this._element.className = "ui-root";
      this._window.document.body.appendChild(this._element);
      this._inputMgr = new InputManager(this);
      this._popupMgr = new PopupManager(this);
      this._modalLayer = new Shape();
      this._modalLayer.setSize(this.width, this.height);
      this._modalLayer.drawRect(0, Color.CLEAR, UIConfig.modalLayerColor);
      this._modalLayer.addRelation(this, 100 /* Size */);
      this.onWinResize();
      ownerWindow.addEventListener("resize", () => this.onWinResize());
    }
    static get inst() {
      return Widget._defaultRoot ?? (Widget._defaultRoot = new _GRoot(window));
    }
    static getInst(w) {
      if (w)
        return w.findRoot();
      else
        return Widget._defaultRoot;
    }
    get window() {
      return this._window;
    }
    get inputMgr() {
      return this._inputMgr;
    }
    get touchTarget() {
      return this._inputMgr.touchTarget;
    }
    get pointerPos() {
      return this._inputMgr.pointerPos;
    }
    getPointerPos(pointerId, out) {
      return this._inputMgr.getPointerPos(pointerId, out);
    }
    get popupMgr() {
      return this._popupMgr;
    }
    get margin() {
      return this._margin;
    }
    set margin(value) {
      this._margin[0] = value[0] || 0;
      this._margin[1] = value[1] || 0;
      this._margin[2] = value[2] || 0;
      this._margin[3] = value[3] || 0;
      this.onWinResize();
    }
    onWinResize() {
      this.setPos(this._margin[3], this._margin[0]);
      this.setSize(this._window.innerWidth - this._margin[1] - this._margin[3], this._window.innerHeight - this._margin[0] - this._margin[2]);
    }
    showWindow(win) {
      this.addChild(win);
      if (win.x > this.width)
        win.x = this.width - win.width;
      else if (win.x + win.width < 0)
        win.x = 0;
      if (win.y > this.height)
        win.y = this.height - win.height;
      else if (win.y + win.height < 0)
        win.y = 0;
      this.adjustModalLayer();
    }
    hideWindow(win) {
      win.hide();
    }
    hideWindowImmediately(win) {
      if (win.parent == this)
        this.removeChild(win);
      this.adjustModalLayer();
    }
    bringToFront(win) {
      let cnt = this.numChildren;
      let i;
      if (this._modalLayer.parent && !win.modal)
        i = this.getChildIndex(this._modalLayer) - 1;
      else
        i = cnt - 1;
      for (; i >= 0; i--) {
        let g = this.getChildAt(i);
        if (g == win)
          return;
        if (g instanceof Window)
          break;
      }
      if (i >= 0)
        this.setChildIndex(win, i);
    }
    showModalWait(msg) {
      if (UIConfig.globalModalWaiting) {
        if (this._modalWaitPane == null)
          this._modalWaitPane = UIConfig.globalModalWaiting.create();
        this._modalWaitPane.setSize(this.width, this.height);
        this._modalWaitPane.addRelation(this, 100 /* Size */);
        this.addChild(this._modalWaitPane);
        this._modalWaitPane.text = msg || "";
      }
    }
    closeModalWait() {
      if (this._modalWaitPane && this._modalWaitPane.parent)
        this.removeChild(this._modalWaitPane);
    }
    closeAllExceptModals() {
      let arr = this.children.slice();
      let cnt = arr.length;
      for (let i = 0; i < cnt; i++) {
        let g = arr[i];
        if (g instanceof Window && !g.modal)
          g.hide();
      }
    }
    closeAllWindows() {
      let arr = this.children.slice();
      let cnt = arr.length;
      for (let i = 0; i < cnt; i++) {
        let g = arr[i];
        if (g instanceof Window)
          g.hide();
      }
    }
    getTopWindow() {
      let cnt = this.numChildren;
      for (let i = cnt - 1; i >= 0; i--) {
        let g = this.getChildAt(i);
        if (g instanceof Window) {
          return g;
        }
      }
      return null;
    }
    get modalLayer() {
      return this._modalLayer;
    }
    get hasModalWindow() {
      return this._modalLayer.parent != null;
    }
    get modalWaiting() {
      return this._modalWaitPane && this._modalWaitPane.onStage;
    }
    showPopup(popup, target, dir) {
      this._popupMgr.showPopup(popup, target, dir);
    }
    togglePopup(popup, target, dir) {
      return this._popupMgr.togglePopup(popup, target, dir);
    }
    hidePopup(popup) {
      this._popupMgr.hidePopup(popup);
    }
    get hasAnyPopup() {
      return this._popupMgr.hasAnyPopup;
    }
    adjustModalLayer() {
      let cnt = this.numChildren;
      if (this._modalWaitPane && this._modalWaitPane.parent)
        this.setChildIndex(this._modalWaitPane, cnt - 1);
      for (let i = cnt - 1; i >= 0; i--) {
        let g = this.getChildAt(i);
        if (g instanceof Window && g.modal) {
          if (this._modalLayer.parent == null)
            this.addChildAt(this._modalLayer, i);
          else
            this.setChildIndexBefore(this._modalLayer, i);
          return;
        }
      }
      if (this._modalLayer.parent)
        this.removeChild(this._modalLayer);
    }
  };

  // src/ui/PopupMenu.ts
  var internalEvent = "click_menu_item";
  var PopupMenu = class extends EventDispatcher {
    constructor(res) {
      super();
      this.visibleItemCount = 0;
      this.hideOnClickItem = true;
      this.autoSize = false;
      if (!res) {
        res = UIConfig.popupMenu;
        if (!res)
          throw "UIConfig.popupMenu not defined";
      }
      this._content = res.create();
      this._initWidth = this._content.width;
      this._list = this._content.getChild("list");
      this._list.removeChildrenToPool();
      this._list.addRelation(this._content, 1 /* Width */);
      this._list.removeRelation(this._content, 2 /* Height */);
      this._content.addRelation(this._list, 2 /* Height */);
      this._list.on("click_item", this._clickItem, this);
    }
    destroy() {
      this._content.destroy();
    }
    addItem(caption, callback, target) {
      let item = this.createItem(caption, callback, target);
      this._list.addChild(item);
      return item;
    }
    addItemAt(caption, index, callback, target) {
      let item = this.createItem(caption, callback, target);
      this._list.addChildAt(item, index);
      return item;
    }
    createItem(caption, callback, target) {
      let item = this._list.getFromPool();
      item.text = caption;
      item.grayed = false;
      let c = item.getController("checked");
      if (c)
        c.selectedIndex = 0;
      item.offAll(internalEvent);
      if (callback)
        item.on(internalEvent, callback, target);
      return item;
    }
    addSeperator(index) {
      if (index == void 0 || index == -1)
        this._list.addItemFromPool("seperator");
      else {
        let item = this._list.getFromPool("seperator");
        this._list.addChildAt(item, index);
      }
    }
    getItemName(index) {
      let item = this._list.getChildAt(index);
      return item.name;
    }
    setItemText(name, caption) {
      let item = this._list.getChild(name);
      item.text = caption;
    }
    setItemVisible(name, visible) {
      let item = this._list.getChild(name);
      item.visible = visible;
    }
    setItemGrayed(name, grayed) {
      let item = this._list.getChild(name);
      item.grayed = grayed;
    }
    setItemCheckable(name, checkable) {
      let item = this._list.getChild(name);
      let c = item.getController("checked");
      if (c) {
        if (checkable) {
          if (c.selectedIndex == 0)
            c.selectedIndex = 1;
        } else
          c.selectedIndex = 0;
      }
    }
    setItemChecked(name, checked) {
      let item = this._list.getChild(name);
      let c = item.getController("checked");
      if (c)
        c.selectedIndex = checked ? 2 : 1;
    }
    isItemChecked(name) {
      let item = this._list.getChild(name);
      let c = item.getController("checked");
      if (c)
        return c.selectedIndex == 2;
      else
        return false;
    }
    removeItem(name) {
      let item = this._list.getChild(name);
      if (item) {
        let index = this._list.getChildIndex(item);
        this._list.removeChildToPoolAt(index);
        return true;
      } else
        return false;
    }
    clearItems() {
      this._list.removeChildrenToPool();
    }
    get itemCount() {
      return this._list.numChildren;
    }
    get contentPane() {
      return this._content;
    }
    get list() {
      return this._list;
    }
    show(target, dir, parentMenu) {
      let groot = target ? target.findRoot() : GRoot.inst;
      if (groot.popupMgr.isPopupJustClosed(this._content))
        return;
      this.emit("popup");
      if (this.autoSize) {
        this._list.layout.refresh();
        let cnt = this._list.numChildren;
        let maxDelta = -1e3;
        for (let i = 0; i < cnt; i++) {
          let obj = this._list.getChildAt(i);
          if (!(obj instanceof Button))
            continue;
          let tf = obj.findTextWidget();
          if (tf instanceof TextField) {
            let v = tf.textWidth - tf.width;
            if (v > maxDelta)
              maxDelta = v;
          }
        }
        if (this._content.width + maxDelta > this._initWidth)
          this._content.width += maxDelta;
        else
          this._content.width = this._initWidth;
      }
      this._list.selection.index = -1;
      this._list.resizeToFit(this.visibleItemCount > 0 ? this.visibleItemCount : Number.POSITIVE_INFINITY, 10);
      groot.togglePopup(this._content, target, dir);
    }
    hide() {
      if (this._content.parent)
        this._content.findRoot().hidePopup(this._content);
    }
    _clickItem(evt) {
      let item = evt.data;
      if (!(item instanceof Button))
        return;
      if (item.grayed) {
        this._list.selection.index = -1;
        return;
      }
      let c = item.getController("checked");
      if (c && c.selectedIndex != 0) {
        if (c.selectedIndex == 1)
          c.selectedIndex = 2;
        else
          c.selectedIndex = 1;
      }
      if (this.hideOnClickItem)
        this.hide();
      item.emit(internalEvent, item);
    }
  };

  // src/core/Texture.ts
  var Texture = class extends Resource {
    constructor() {
      super();
    }
    get width() {
      return this.svgSize ? this.svgSize[0] : this.source.width;
    }
    get height() {
      return this.svgSize ? this.svgSize[1] : this.source.height;
    }
  };

  // src/ui/Loader.ts
  var Loader = class extends Widget {
    constructor() {
      super();
      this._srcWidth = 0;
      this._srcHeight = 0;
      this._loadId = 0;
      this._src = "";
      this._fitMode = 2 /* Contain */;
      this._shrinkOnly = false;
      this._align = 1 /* Center */;
      this._valign = 1 /* Middle */;
      this.loadOptions = { maybeType: "image" };
      this._content = new Image2();
      this._content.hideFlags |= HideFlags.HideAndDontSave;
      if (!UIPackage.isPlaying) {
        this._content.on("resource_reload", () => {
          this._srcWidth = this._content.texture.width;
          this._srcHeight = this._content.texture.height;
          this.updateLayout();
        });
      }
      this.addChild(this._content);
    }
    get src() {
      return this._src;
    }
    set src(value) {
      if (value == null)
        value = "";
      if (this._src == value)
        return;
      this._src = value;
      this.loadContent();
    }
    get icon() {
      return this._src;
    }
    set icon(value) {
      this.src = value;
    }
    get align() {
      return this._align;
    }
    set align(value) {
      if (this._align != value) {
        this._align = value;
        Timers.callLater(this.updateLayout, this);
      }
    }
    get valign() {
      return this._valign;
    }
    set valign(value) {
      if (this._valign != value) {
        this._valign = value;
        Timers.callLater(this.updateLayout, this);
      }
    }
    get fitMode() {
      return this._fitMode;
    }
    set fitMode(value) {
      if (this._fitMode != value) {
        this._fitMode = value;
        Timers.callLater(this.updateLayout, this);
      }
    }
    get shrinkOnly() {
      return this._shrinkOnly;
    }
    set shrinkOnly(value) {
      if (this._shrinkOnly != value) {
        this._shrinkOnly = value;
        Timers.callLater(this.updateLayout, this);
      }
    }
    get color() {
      return this._content.color;
    }
    set color(value) {
      this._content.color = value;
    }
    get texture() {
      return this._content.texture;
    }
    set texture(value) {
      this._src = "instance-0";
      this.onLoaded(value, ++this._loadId);
    }
    async loadContent() {
      let loadID = ++this._loadId;
      if (this._src) {
        let res = UIPackage.resourceMgr.getRes(this._src);
        if (!res)
          res = await UIPackage.resourceMgr.load(this._src, this.loadOptions);
        this.onLoaded(res, loadID);
      } else
        this.onLoaded(null, loadID);
    }
    onLoaded(value, loadId) {
      if (loadId != this._loadId || this.destroyed)
        return;
      if (value instanceof Texture) {
        if (this._content.texture == value)
          return;
        this._srcWidth = value.width;
        this._srcHeight = value.height;
        this._content.texture = value;
        Timers.runCallLater(this.updateLayout, this);
      } else {
        this._srcWidth = 0;
        this._srcHeight = 0;
        this._content.src = null;
      }
      this.emit("loaded");
    }
    updateLayout() {
      if (this._srcWidth == 0 || this._srcHeight == 0)
        return;
      this._updatingLayout = true;
      let sx = 1, sy = 1;
      let cw = this._srcWidth, ch = this._srcHeight;
      if (this._fitMode != 0 /* None */ && cw != 0 && ch != 0) {
        sx = this.width / cw;
        sy = this.height / ch;
        if (sx != 1 || sy != 1) {
          if (this._fitMode == 5 /* CoverHeight */)
            sx = sy;
          else if (this._fitMode == 4 /* CoverWidth */)
            sy = sx;
          else if (this._fitMode == 2 /* Contain */) {
            if (sx > sy)
              sx = sy;
            else
              sy = sx;
          } else if (this._fitMode == 3 /* Cover */) {
            if (sx > sy)
              sy = sx;
            else
              sx = sy;
          }
          if (this._shrinkOnly) {
            if (sx > 1)
              sx = 1;
            if (sy > 1)
              sy = 1;
          }
          cw = cw * sx;
          ch = ch * sy;
        }
      }
      this._content.setSize(cw, ch);
      let nx, ny;
      if (this._align == 1 /* Center */)
        nx = Math.floor((this.width - cw) / 2);
      else if (this._align == 2 /* Right */)
        nx = this.width - cw;
      else
        nx = 0;
      if (this._valign == 1 /* Middle */)
        ny = Math.floor((this.height - ch) / 2);
      else if (this._valign == 2 /* Bottom */)
        ny = this.height - ch;
      else
        ny = 0;
      this._content.setPos(nx, ny);
      this._updatingLayout = false;
    }
    _sizeChanged() {
      super._sizeChanged();
      if (!this._updatingLayout)
        Timers.callLater(this.updateLayout, this);
    }
  };

  // src/ui/selection/ListSelection.ts
  var ListSelection = class extends Selection {
    constructor(owner) {
      super(owner);
      this._layout = owner.layout;
    }
    get index() {
      if (this._layout._virtual) {
        for (let i = 0; i < this._layout._realNumItems; i++) {
          let ii = this._layout._items[i];
          if (ii.obj instanceof Button && ii.obj.selected || ii.obj == null && ii.selected) {
            if (this._layout._loop)
              return i % this._layout.numItems;
            else
              return i;
          }
        }
        return -1;
      } else
        return super.index;
    }
    set index(value) {
      if (this._layout._virtual) {
        if (value >= 0 && value < this._layout.numItems) {
          if (this._mode != 1 /* Single */)
            this.clear();
          this.add(value);
        } else
          this.clear();
      } else
        super.index = value;
    }
    get(out) {
      if (this._layout._virtual) {
        if (!out)
          out = [];
        for (let i = 0; i < this._layout._realNumItems; i++) {
          let ii = this._layout._items[i];
          if (ii.obj instanceof Button && ii.obj.selected || ii.obj == null && ii.selected) {
            let j = i;
            if (this._layout._loop) {
              j = i % this._layout.numItems;
              if (out.indexOf(j) != -1)
                continue;
            }
            out.push(j);
          }
        }
        return out;
      } else
        return super.get(out);
    }
    add(index, scrollItToView) {
      if (this._layout._virtual) {
        if (this._mode == 4 /* Disabled */)
          return;
        this._layout._checkVirtualList();
        if (this._mode == 1 /* Single */)
          this.clear();
        if (scrollItToView)
          this._owner.scroller.scrollTo(index);
        this._lastIndex = index;
        let obj;
        let ii = this._layout._items[index];
        if (ii.obj)
          obj = ii.obj;
        ii.selected = true;
        if (obj instanceof Button && !obj.selected)
          obj.selected = true;
      } else
        super.add(index, scrollItToView);
    }
    remove(index) {
      if (this._layout._virtual) {
        if (this._mode == 4 /* Disabled */)
          return;
        let obj;
        let ii = this._layout._items[index];
        if (ii.obj)
          obj = ii.obj;
        ii.selected = false;
        if (obj instanceof Button)
          obj.selected = false;
      } else
        super.remove(index);
    }
    clear() {
      if (this._layout._virtual) {
        for (let i = 0; i < this._layout._realNumItems; i++) {
          let ii = this._layout._items[i];
          if (ii.obj instanceof Button)
            ii.obj.selected = false;
          ii.selected = false;
        }
      } else
        super.clear();
    }
    clearExcept(g) {
      if (this._layout._virtual) {
        for (let i = 0; i < this._layout._realNumItems; i++) {
          let ii = this._layout._items[i];
          if (ii.obj != g) {
            if (ii.obj instanceof Button)
              ii.obj.selected = false;
            ii.selected = false;
          }
        }
      } else
        super.clearExcept(g);
    }
    selectAll() {
      if (this._layout._virtual) {
        this._layout._checkVirtualList();
        for (let i = 0; i < this._layout._realNumItems; i++) {
          let ii = this._layout._items[i];
          if (ii.obj instanceof Button && !ii.obj.selected) {
            ii.obj.selected = true;
          }
          ii.selected = true;
        }
      } else
        super.selectAll();
    }
    selectReverse() {
      if (this._layout._virtual) {
        this._layout._checkVirtualList();
        for (let i = 0; i < this._layout._realNumItems; i++) {
          let ii = this._layout._items[i];
          if (ii.obj instanceof Button) {
            ii.obj.selected = !ii.obj.selected;
          }
          ii.selected = !ii.selected;
        }
      } else
        super.selectReverse();
    }
    handleClick(item, evt) {
      if (this._layout._virtual) {
        let scroller = this._owner.scroller;
        if (scroller?.isDragged)
          return;
        if (evt.input.isRightButton && !this.allowSelectByRightClick)
          return;
        if (item.mode == 0 /* Common */) {
          this._owner.emit("click_item", item);
          return;
        }
        let dontChangeLastIndex = false;
        let index = this._layout.childIndexToItemIndex(this._owner.getChildIndex(item));
        if (this._mode == 4 /* Disabled */) {
        } else if (this._mode == 1 /* Single */) {
          if (!item.selected) {
            this.clearExcept(item);
            item.selected = true;
            item.emit("changed");
          }
        } else {
          if (evt.input.shiftKey) {
            if (!item.selected) {
              if (this._lastIndex != -1) {
                let min = Math.min(this._lastIndex, index);
                let max = Math.max(this._lastIndex, index);
                max = Math.min(max, this._layout.numItems - 1);
                for (let i = min; i <= max; i++) {
                  let ii = this._layout._items[i];
                  if (ii.obj instanceof Button) {
                    ii.obj.selected = true;
                    if (ii.obj == item)
                      item.emit("changed");
                  }
                  ii.selected = true;
                }
                dontChangeLastIndex = true;
              } else {
                item.selected = true;
                item.emit("changed");
              }
            }
          } else if (evt.input.ctrlKey || evt.input.commandKey || this._mode == 3 /* MultipleBySingleClick */) {
            item.selected = !item.selected;
            item.emit("changed");
          } else {
            if (!item.selected) {
              this.clearExcept(item);
              item.selected = true;
              item.emit("changed");
            } else if (evt.input.button == 0)
              this.clearExcept(item);
          }
        }
        if (!dontChangeLastIndex)
          this._lastIndex = index;
        if (evt.input.isDblClick && evt.initiator instanceof TextInput)
          return;
        this._owner.emit("click_item", item);
      } else
        super.handleClick(item, evt);
    }
    handleArrowKey(dir) {
      if (this._layout._virtual) {
        let curIndex = this.index;
        if (curIndex == -1) {
          if (this._owner.numChildren > 0) {
            this.clear();
            this.add(0, true);
            if (this._keyEvent)
              this._owner.emit(this._keyEvent, this._owner.getChildAt(0));
            return 0;
          } else
            return -1;
        }
        let index = curIndex;
        let layout = this._layout.type;
        switch (dir) {
          case 1:
            if (layout == 1 /* SingleColumn */ || layout == 4 /* FlowY */) {
              index--;
            } else if (layout == 3 /* FlowX */) {
              index -= this._layout._lineItemCnt;
            }
            break;
          case 3:
            if (layout == 2 /* SingleRow */ || layout == 3 /* FlowX */) {
              index++;
            } else if (layout == 4 /* FlowY */) {
              index += this._layout._lineItemCnt;
            }
            break;
          case 5:
            if (layout == 1 /* SingleColumn */ || layout == 4 /* FlowY */) {
              index++;
            } else if (layout == 3 /* FlowX */) {
              index += this._layout._lineItemCnt;
            }
            break;
          case 7:
            if (layout == 2 /* SingleRow */ || layout == 3 /* FlowX */) {
              index--;
            } else if (layout == 4 /* FlowY */) {
              index -= this._layout._lineItemCnt;
            }
            break;
        }
        if (index != curIndex && index >= 0 && index < this._layout.numItems) {
          this.clear();
          this.add(index, true);
          if (this._keyEvent) {
            let childIndex = this._layout.itemIndexToChildIndex(index);
            if (childIndex != -1)
              this._owner.emit(this._keyEvent, this._owner.getChildAt(childIndex));
          }
          return index;
        } else
          return -1;
      } else
        return super.handleArrowKey(dir);
    }
  };

  // src/ui/List.ts
  var List = class extends Panel {
    constructor() {
      super(ListLayout, ListSelection);
      this._layout.type = 1 /* SingleColumn */;
      this._selection.mode = 1 /* Single */;
      this._pool = new WidgetPool();
    }
    destroy() {
      this._pool.clear();
      super.destroy();
    }
    get layout() {
      return this._layout;
    }
    get itemTemplate() {
      return this._pool.defaultRes;
    }
    set itemTemplate(value) {
      this._pool.defaultRes = value;
    }
    get itemPool() {
      return this._pool;
    }
    getFromPool(url) {
      let obj = this._pool.getObject(url);
      if (obj) {
        obj.visible = true;
        if (obj instanceof Button)
          obj.selected = false;
      }
      return obj;
    }
    returnToPool(obj) {
      this._pool.returnObject(obj);
    }
    addItemFromPool(url) {
      let child = this.getFromPool(url);
      return this.addChild(child);
    }
    removeChildToPoolAt(index) {
      let child = super.removeChildAt(index);
      this.returnToPool(child);
    }
    removeChildToPool(child) {
      super.removeChild(child);
      this.returnToPool(child);
    }
    removeChildrenToPool(beginIndex, endIndex) {
      beginIndex = beginIndex || 0;
      if (endIndex == null)
        endIndex = -1;
      if (endIndex < 0 || endIndex >= this.children.length)
        endIndex = this.children.length - 1;
      for (let i = beginIndex; i <= endIndex; ++i)
        this.removeChildToPoolAt(beginIndex);
    }
    get numItems() {
      return this._layout.numItems;
    }
    set numItems(value) {
      this._layout.numItems = value;
    }
    resizeToFit(itemCount, minSize) {
      this._layout.resizeToFit(itemCount, minSize);
    }
    childIndexToItemIndex(index) {
      return this._layout.childIndexToItemIndex(index);
    }
    itemIndexToChildIndex(index) {
      return this._layout.itemIndexToChildIndex(index);
    }
    refreshVirtualList() {
      this._layout.refreshVirtualList();
    }
    setVirtual() {
      this._setVirtual(false);
    }
    /**
     * Set the list to be virtual list, and has loop behavior.
     */
    setVirtualAndLoop() {
      this._setVirtual(true);
    }
    _setVirtual(loop) {
      if (!this._layout._virtual) {
        if (this.scroller == null)
          throw new Error("Virtual list must be scrollable!");
        if (loop) {
          if (this._layout.type == 3 /* FlowX */ || this._layout.type == 4 /* FlowY */)
            throw new Error("Loop list does not support flowX or flowY layout!");
          this.scroller.bouncebackEffect = 2 /* Off */;
        }
      }
      this._layout._setVirtual(loop);
    }
    onAfterDeserialize() {
      super.onAfterDeserialize();
      if (SerializeUtil.hasProp("_initItemNum", "_itemData") && (UIPackage.isPreview || !SerializeUtil._data._isDemo))
        this._buildInitItems();
    }
    /** @internal */
    _buildInitItems() {
      for (let i = this.children.length - 1; i >= 0; i--) {
        let child = this.getChildAt(i);
        if (child.hasHideFlag(HideFlags.HideAndDontSave))
          child.destroy();
      }
      if (this.itemTemplate == null)
        return;
      let itemData = this._itemData;
      for (let i = 0; i < this._initItemNum; i++) {
        let m = itemData && i < itemData.length ? itemData[i] : null;
        if (m != null) {
          let child = m.res ? this.addChild(m.res.create()) : this.addItemFromPool();
          child.hideFlags |= HideFlags.HideAndDontSave;
          child.text = m.title;
          if (m.icon)
            child.icon = m.icon;
          if (child instanceof Button) {
            if (m.selectedTitle)
              child.selectedTitle = m.selectedTitle;
            if (m.selectedIcon)
              child.selectedIcon = m.selectedIcon;
            child.selected = false;
          }
          if (m.name != null)
            child.name = m.name;
        } else
          this.addItemFromPool();
      }
      this.selection._refresh();
    }
  };

  // src/ui/ComboBox.ts
  var ComboBox = class extends Label {
    constructor() {
      super();
      this.popupDirection = 0;
      this.visibleItemCount = 0;
      this._itemsUpdated = true;
      this._selectedIndex = -1;
      this._items = [];
      this._values = [];
      this._icons = [];
      this.on("roll_over", this._rollover, this);
      this.on("roll_out", this._rollout, this);
      this.on("pointer_down", this._mousedown, this);
      this.on("pointer_up", this._mouseup, this);
    }
    get items() {
      return this._items;
    }
    set items(value) {
      let arr = this._items;
      arr.length = 0;
      if (value)
        arr.push(...value);
      this._itemsUpdated = true;
      if (SerializeUtil.isDeserializing) {
        if (arr.length > 0)
          this._selectedIndex = 0;
        return;
      }
      if (arr.length > 0) {
        if (this._selectedIndex >= arr.length)
          this._selectedIndex = arr.length - 1;
        else if (this._selectedIndex == -1)
          this._selectedIndex = 0;
        this.title = arr[this._selectedIndex];
        if (this._selectedIndex < this._icons.length)
          this.icon = this._icons[this._selectedIndex];
      } else {
        this.title = "";
        if (this._icons)
          this.icon = null;
        this._selectedIndex = -1;
      }
    }
    get icons() {
      return this._icons;
    }
    set icons(value) {
      let arr = this._icons;
      arr.length = 0;
      if (value)
        arr.push(...value);
      this._itemsUpdated = true;
      if (SerializeUtil.isDeserializing)
        return;
      if (this._selectedIndex != -1 && this._selectedIndex < arr.length)
        this.icon = arr[this._selectedIndex];
    }
    get values() {
      return this._values;
    }
    set values(value) {
      this._values.length = 0;
      if (value)
        this._values.push(...value);
      this._itemsUpdated = true;
    }
    get selectedIndex() {
      return this._selectedIndex;
    }
    set selectedIndex(val) {
      if (this._selectedIndex === val && !this._itemsUpdated)
        return;
      this._selectedIndex = val;
      if (val >= 0 && val < this._items.length) {
        this.title = this._items[val];
        if (val < this._icons.length)
          this.icon = this._icons[val];
      } else {
        this.title = "";
        if (this._icons)
          this.icon = "";
      }
      let cc = this._selectedController?.inst;
      if (cc != null && val >= 0 && val < cc.numPages && !cc.changing)
        this._selectedController.selectedIndex = val;
    }
    get value() {
      return this._values[this._selectedIndex];
    }
    set value(val) {
      let index = this._values.indexOf(val);
      if (index == -1 && val == null)
        index = this._values.indexOf("");
      this.selectedIndex = index;
    }
    get dropdownRes() {
      return this._dropdownRes;
    }
    set dropdownRes(value) {
      this._dropdownRes = value;
      this.createDropdown();
    }
    get dropdown() {
      return this._dropdown;
    }
    get selectedController() {
      return this._selectedController;
    }
    set selectedController(value) {
      if (this._selectedController)
        this._selectedController.release();
      this._selectedController = value;
      if (value) {
        value.validate();
        value.onChanged = this.selectChanged.bind(this);
        this.selectChanged();
      }
    }
    destroy() {
      if (this._dropdown) {
        this._dropdown.destroy();
        this._dropdown = null;
      }
      if (this._selectedController)
        this._selectedController.release();
      super.destroy();
    }
    updateList() {
      if (!this._dropdown.onStage)
        return;
      this._updateDropDown();
      this._list.layout.refresh();
      this.findRoot().popupMgr.validatePopupPosition(this._dropdown, this, this.popupDirection);
    }
    createDropdown() {
      if (this._dropdown) {
        this._dropdown.destroy();
        this._dropdown = null;
        this._list = null;
      }
      if (this._dropdownRes) {
        this._dropdown = this._dropdownRes.create();
        this._list = this._dropdown.getChild("list");
        if (this._list == null) {
          console.warn(this._dropdownRes + ": should container a list component named list.");
          return;
        }
        this._list.on("click_item", this._clickItem, this);
        this._list.addRelation(this._dropdown, 1 /* Width */);
        this._list.removeRelation(this._dropdown, 2 /* Height */);
        this._dropdown.addRelation(this._list, 2 /* Height */);
        this._dropdown.removeRelation(this._list, 1 /* Width */);
        this._dropdown.on("removed_from_stage", this._popupWinClosed, this);
      }
    }
    _controllersChanged() {
      super._controllersChanged();
      let c = this.getController("button");
      if (this._buttonController != c) {
        this._buttonController = c;
        if (this._buttonController.numPages > 0)
          this.setCurrentState();
      }
    }
    selectChanged() {
      this.selectedIndex = this._selectedController.selectedIndex;
    }
    setState(page) {
      if (this._buttonController) {
        if (page >= this._buttonController.numPages) {
          page = ButtonPageAlternatives[page];
          if (page == null)
            return;
        }
        this._buttonController.selectedIndex = page;
      }
    }
    setCurrentState() {
      let p = this._dropdown && this._dropdown.parent ? 1 /* Down */ : this._over ? 2 /* Over */ : 0 /* Up */;
      this.setState(this.grayed ? 4 /* Disabled */ : p);
    }
    showDropdown() {
      if (!this._dropdown) {
        this.setState(1 /* Down */);
        return;
      }
      let groot = this.findRoot();
      if (groot.popupMgr.isPopupJustClosed(this._dropdown))
        return;
      this.emit("popup");
      if (this._itemsUpdated)
        this._updateDropDown();
      this._list.selection.index = -1;
      this._dropdown.width = this.width;
      this._list.layout.refresh();
      this.findRoot().showPopup(this._dropdown, this, this.popupDirection);
      this.setState(1 /* Down */);
    }
    _updateDropDown() {
      this._itemsUpdated = false;
      this._list.removeChildrenToPool();
      let cnt = this._items.length;
      for (let i = 0; i < cnt; i++) {
        let item = this._list.addItemFromPool();
        item.name = i < this._values.length ? this._values[i] : "";
        item.text = this._items[i];
        item.icon = i < this._icons.length ? this._icons[i] : "";
      }
      this._list.resizeToFit(this.visibleItemCount > 0 ? this.visibleItemCount : UIConfig.defaultComboBoxVisibleItemCount);
    }
    _popupWinClosed() {
      this.setCurrentState();
    }
    _clickItem(evt) {
      if (this._dropdown.parent instanceof GRoot)
        this._dropdown.parent.hidePopup();
      this._selectedIndex = -1;
      this.selectedIndex = this._list.getChildIndex(evt.data);
      this.emit("changed");
    }
    _rollover() {
      this._over = true;
      if (this._down || this._dropdown && this._dropdown.parent)
        return;
      this.setCurrentState();
    }
    _rollout() {
      this._over = false;
      if (this._down || this._dropdown && this._dropdown.parent)
        return;
      this.setCurrentState();
    }
    _mousedown(evt) {
      if (evt.initiator instanceof TextInput)
        return;
      this._down = true;
      this.showDropdown();
      evt.capturePointer();
    }
    _mouseup() {
      if (this._down) {
        this._down = false;
        this.setCurrentState();
      }
    }
  };

  // src/ui/gear/GearNumber.ts
  var GearNumber = class extends Gear {
    doTween(obj, key, oldValue, newValue) {
      let tc = this._tween;
      if (this._tweener) {
        if (this._tweener.endValue.x != newValue) {
          this._tweener.kill(true);
          this._tweener = null;
        } else
          return;
      }
      this._tweener = (this._isColor ? Tween.toColor : Tween.to)(oldValue, newValue, tc.duration).setDelay(tc.delay).setEase(tc.easeType).setTarget(this).onUpdate((tweener) => obj[key] = tweener.value.x).onComplete(() => this._tweener = null);
    }
  };
  var GearHexColor = class extends GearNumber {
    constructor() {
      super();
      this._isColor = true;
    }
  };

  // src/ui/gear/GearColor.ts
  var GearColor = class extends Gear {
    doTween(obj, key, oldValue, newValue) {
      let tc = this._tween;
      if (this._tweener) {
        if (this._tweener.endValue.color != newValue.getHex()) {
          this._tweener.kill(true);
          this._tweener = null;
        } else
          return;
      }
      let t = new Color();
      this._tweener = Tween.toColor(oldValue.getHex(), newValue.getHex(), tc.duration).setDelay(tc.delay).setEase(tc.easeType).setTarget(this).onUpdate((tweener) => {
        t.parse(tweener.value.color);
        obj[key] = t;
      }).onComplete(() => this._tweener = null);
    }
  };

  // src/tween/PathPoint.ts
  var CurveType = /* @__PURE__ */ ((CurveType2) => {
    CurveType2[CurveType2["CRSpline"] = 0] = "CRSpline";
    CurveType2[CurveType2["Bezier"] = 1] = "Bezier";
    CurveType2[CurveType2["CubicBezier"] = 2] = "CubicBezier";
    CurveType2[CurveType2["Straight"] = 3] = "Straight";
    return CurveType2;
  })(CurveType || {});
  var PathPoint = class _PathPoint {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.control1_x = 0;
      this.control1_y = 0;
      this.control2_x = 0;
      this.control2_y = 0;
      this.curveType = 0;
    }
    static newPoint(x, y, curveType) {
      let pt = new _PathPoint();
      pt.x = x || 0;
      pt.y = y || 0;
      pt.control1_x = 0;
      pt.control1_y = 0;
      pt.control2_x = 0;
      pt.control2_y = 0;
      pt.curveType = curveType || 0 /* CRSpline */;
      return pt;
    }
    static newBezierPoint(x, y, control1_x, control1_y) {
      let pt = new _PathPoint();
      pt.x = x || 0;
      pt.y = y || 0;
      pt.control1_x = control1_x || 0;
      pt.control1_y = control1_y || 0;
      pt.control2_x = 0;
      pt.control2_y = 0;
      pt.curveType = 1 /* Bezier */;
      return pt;
    }
    static newCubicBezierPoint(x, y, control1_x, control1_y, control2_x, control2_y) {
      let pt = new _PathPoint();
      pt.x = x || 0;
      pt.y = y || 0;
      pt.control1_x = control1_x || 0;
      pt.control1_y = control1_y || 0;
      pt.control2_x = control2_x || 0;
      pt.control2_y = control2_y || 0;
      pt.curveType = 2 /* CubicBezier */;
      return pt;
    }
    clone() {
      let pt = new _PathPoint();
      pt.x = this.x;
      pt.y = this.y;
      pt.control1_x = this.control1_x;
      pt.control1_y = this.control1_y;
      pt.control2_x = this.control2_x;
      pt.control2_y = this.control2_y;
      pt.curveType = this.curveType;
      return pt;
    }
  };

  // src/tween/GPath.ts
  var GPath = class {
    constructor() {
      this._segments = [];
      this._points = [];
    }
    get length() {
      return this._fullLength;
    }
    create2(pt1, pt2, pt3, pt4) {
      let points = [];
      points.push(pt1);
      points.push(pt2);
      if (pt3)
        points.push(pt3);
      if (pt4)
        points.push(pt4);
      this.create(points);
    }
    create(points) {
      this._segments.length = 0;
      this._points.length = 0;
      this._fullLength = 0;
      let cnt = points.length;
      if (cnt == 0)
        return;
      let splinePoints = [];
      let prev = points[0];
      if (prev.curveType == 0 /* CRSpline */)
        splinePoints.push(new Vec2(prev.x, prev.y));
      for (let i = 1; i < cnt; i++) {
        let current = points[i];
        if (prev.curveType != 0 /* CRSpline */) {
          let seg = {};
          seg.type = prev.curveType;
          seg.ptStart = this._points.length;
          if (prev.curveType == 3 /* Straight */) {
            seg.ptCount = 2;
            this._points.push(new Vec2(prev.x, prev.y));
            this._points.push(new Vec2(current.x, current.y));
          } else if (prev.curveType == 1 /* Bezier */) {
            seg.ptCount = 3;
            this._points.push(new Vec2(prev.x, prev.y));
            this._points.push(new Vec2(current.x, current.y));
            this._points.push(new Vec2(prev.control1_x, prev.control1_y));
          } else if (prev.curveType == 2 /* CubicBezier */) {
            seg.ptCount = 4;
            this._points.push(new Vec2(prev.x, prev.y));
            this._points.push(new Vec2(current.x, current.y));
            this._points.push(new Vec2(prev.control1_x, prev.control1_y));
            this._points.push(new Vec2(prev.control2_x, prev.control2_y));
          }
          seg.length = distance(prev.x, prev.y, current.x, current.y);
          this._fullLength += seg.length;
          this._segments.push(seg);
        }
        if (current.curveType != 0 /* CRSpline */) {
          if (splinePoints.length > 0) {
            splinePoints.push(new Vec2(current.x, current.y));
            this.createSplineSegment(splinePoints);
          }
        } else
          splinePoints.push(new Vec2(current.x, current.y));
        prev = current;
      }
      if (splinePoints.length > 1)
        this.createSplineSegment(splinePoints);
    }
    createSplineSegment(splinePoints) {
      let cnt = splinePoints.length;
      splinePoints.splice(0, 0, splinePoints[0]);
      splinePoints.push(splinePoints[cnt]);
      splinePoints.push(splinePoints[cnt]);
      cnt += 3;
      let seg = {};
      seg.type = 0 /* CRSpline */;
      seg.ptStart = this._points.length;
      seg.ptCount = cnt;
      this._points = this._points.concat(splinePoints);
      seg.length = 0;
      for (let i = 1; i < cnt; i++) {
        seg.length += distance(
          splinePoints[i - 1].x,
          splinePoints[i - 1].y,
          splinePoints[i].x,
          splinePoints[i].y
        );
      }
      this._fullLength += seg.length;
      this._segments.push(seg);
      splinePoints.length = 0;
    }
    clear() {
      this._segments.length = 0;
      this._points.length = 0;
    }
    getPointAt(t, out) {
      if (!out)
        out = new Vec2();
      else
        out.set(0, 0);
      t = clamp01(t);
      let cnt = this._segments.length;
      if (cnt == 0) {
        return out;
      }
      if (t == 1) {
        let seg = this._segments[cnt - 1];
        if (seg.type == 3 /* Straight */) {
          out.x = lerp(this._points[seg.ptStart].x, this._points[seg.ptStart + 1].x, t);
          out.y = lerp(this._points[seg.ptStart].y, this._points[seg.ptStart + 1].y, t);
          return out;
        } else if (seg.type == 1 /* Bezier */ || seg.type == 2 /* CubicBezier */)
          return this.onBezierCurve(seg.ptStart, seg.ptCount, t, out);
        else
          return this.onCRSplineCurve(seg.ptStart, seg.ptCount, t, out);
      }
      for (let i = 0, len = t * this._fullLength; i < cnt; i++) {
        let seg = this._segments[i];
        len -= seg.length;
        if (len < 0) {
          t = 1 + len / seg.length;
          if (seg.type == 3 /* Straight */) {
            out.x = lerp(this._points[seg.ptStart].x, this._points[seg.ptStart + 1].x, t);
            out.y = lerp(this._points[seg.ptStart].y, this._points[seg.ptStart + 1].y, t);
          } else if (seg.type == 1 /* Bezier */ || seg.type == 2 /* CubicBezier */)
            out = this.onBezierCurve(seg.ptStart, seg.ptCount, t, out);
          else
            out = this.onCRSplineCurve(seg.ptStart, seg.ptCount, t, out);
          break;
        }
      }
      return out;
    }
    get segmentCount() {
      return this._segments.length;
    }
    getAnchorsInSegment(segmentIndex, points) {
      if (points == null)
        points = [];
      let seg = this._segments[segmentIndex];
      for (let i = 0; i < seg.ptCount; i++)
        points.push(new Vec2(this._points[seg.ptStart + i].x, this._points[seg.ptStart + i].y));
      return points;
    }
    getPointsInSegment(segmentIndex, t0, t1, points, ts, pointDensity) {
      if (points == null)
        points = [];
      if (!pointDensity || isNaN(pointDensity))
        pointDensity = 0.1;
      if (ts)
        ts.push(t0);
      let seg = this._segments[segmentIndex];
      if (seg.type == 3 /* Straight */) {
        points.push(new Vec2(
          lerp(this._points[seg.ptStart].x, this._points[seg.ptStart + 1].x, t0),
          lerp(this._points[seg.ptStart].y, this._points[seg.ptStart + 1].y, t0)
        ));
        points.push(new Vec2(
          lerp(this._points[seg.ptStart].x, this._points[seg.ptStart + 1].x, t1),
          lerp(this._points[seg.ptStart].y, this._points[seg.ptStart + 1].y, t1)
        ));
      } else {
        let func;
        if (seg.type == 1 /* Bezier */ || seg.type == 2 /* CubicBezier */)
          func = this.onBezierCurve;
        else
          func = this.onCRSplineCurve;
        points.push(func.call(this, seg.ptStart, seg.ptCount, t0, new Vec2()));
        let SmoothAmount = Math.min(seg.length * pointDensity, 50);
        for (let j = 0; j <= SmoothAmount; j++) {
          let t = j / SmoothAmount;
          if (t > t0 && t < t1) {
            points.push(func.call(this, seg.ptStart, seg.ptCount, t, new Vec2()));
            if (ts)
              ts.push(t);
          }
        }
        points.push(func.call(this, seg.ptStart, seg.ptCount, t1, new Vec2()));
      }
      if (ts)
        ts.push(t1);
      return points;
    }
    getAllPoints(points, ts, pointDensity) {
      if (points == null)
        points = [];
      if (!pointDensity || isNaN(pointDensity))
        pointDensity = 0.1;
      for (let i = 0, cnt = this._segments.length; i < cnt; i++)
        this.getPointsInSegment(i, 0, 1, points, ts, pointDensity);
      return points;
    }
    onCRSplineCurve(ptStart, ptCount, t, result) {
      let adjustedIndex = Math.floor(t * (ptCount - 4)) + ptStart;
      let p0x = this._points[adjustedIndex].x;
      let p0y = this._points[adjustedIndex].y;
      let p1x = this._points[adjustedIndex + 1].x;
      let p1y = this._points[adjustedIndex + 1].y;
      let p2x = this._points[adjustedIndex + 2].x;
      let p2y = this._points[adjustedIndex + 2].y;
      let p3x = this._points[adjustedIndex + 3].x;
      let p3y = this._points[adjustedIndex + 3].y;
      let adjustedT = t == 1 ? 1 : repeat(t * (ptCount - 4), 1);
      let t0 = ((-adjustedT + 2) * adjustedT - 1) * adjustedT * 0.5;
      let t1 = ((3 * adjustedT - 5) * adjustedT * adjustedT + 2) * 0.5;
      let t2 = ((-3 * adjustedT + 4) * adjustedT + 1) * adjustedT * 0.5;
      let t3 = (adjustedT - 1) * adjustedT * adjustedT * 0.5;
      result.x = p0x * t0 + p1x * t1 + p2x * t2 + p3x * t3;
      result.y = p0y * t0 + p1y * t1 + p2y * t2 + p3y * t3;
      return result;
    }
    onBezierCurve(ptStart, ptCount, t, result) {
      let t2 = 1 - t;
      let p0x = this._points[ptStart].x;
      let p0y = this._points[ptStart].y;
      let p1x = this._points[ptStart + 1].x;
      let p1y = this._points[ptStart + 1].y;
      let cp0x = this._points[ptStart + 2].x;
      let cp0y = this._points[ptStart + 2].y;
      if (ptCount == 4) {
        let cp1x = this._points[ptStart + 3].x;
        let cp1y = this._points[ptStart + 3].y;
        result.x = t2 * t2 * t2 * p0x + 3 * t2 * t2 * t * cp0x + 3 * t2 * t * t * cp1x + t * t * t * p1x;
        result.y = t2 * t2 * t2 * p0y + 3 * t2 * t2 * t * cp0y + 3 * t2 * t * t * cp1y + t * t * t * p1y;
      } else {
        result.x = t2 * t2 * p0x + 2 * t2 * t * cp0x + t * t * p1x;
        result.y = t2 * t2 * p0y + 2 * t2 * t * cp0y + t * t * p1y;
      }
      return result;
    }
  };

  // src/display/SLine.ts
  var SLine = class extends SGraphics {
    constructor(color, style) {
      super();
      this.sizeSensitive = true;
      this._color = color ?? new Color().copy(Color.BLACK);
      this._style = style || "solid";
    }
    get color() {
      return this._color;
    }
    set color(value) {
      this._color = value;
      this.refresh();
    }
    getColor() {
      return this._color.getHex();
    }
    setColor(value) {
      this._color.parse(value);
      this.refresh();
    }
    get style() {
      return this._style;
    }
    set style(value) {
      this._style = value;
      this.refresh();
    }
    onRender(style) {
      if (this.owner.width > this.owner.height)
        style.borderTop = `${this.owner.height}px ${this._style} ${this._color.getStyleString()}`;
      else
        style.borderLeft = `${this.owner.width}px ${this._style} ${this._color.getStyleString()}`;
    }
  };

  // src/display/SEllipse.ts
  var SEllipse = class extends SRect {
    onRender(style) {
      super.onRender(style);
      style.borderRadius = "50% / 50%";
    }
  };

  // src/core/BatchProgress.ts
  var BatchProgress = class {
    constructor(callback) {
      this._callback = callback;
      this._items = [];
      this._weights = [];
      this._progress = 0;
    }
    get itemCount() {
      return this._items.length;
    }
    reset() {
      this._items.length = 0;
      this._weights.length = 0;
      this._progress = 0;
    }
    createCallback(weight) {
      let index = this._items.length;
      this._items.push(0);
      if (weight == null)
        this._weights.push(null);
      else
        this._weights.push(Math.max(0, Math.min(weight, 1)));
      return (progress) => this.update(index, progress);
    }
    update(index, value) {
      if (index != -1) {
        this._items[index] = Math.max(0, Math.min(value, 1));
        let np = 0;
        let col = this._items;
        let ws = this._weights;
        let perc = 1 / col.length;
        for (let i = 0; i < col.length; i++) {
          let p = col[i];
          let w = ws[i];
          if (p != null)
            np += p * (w != null ? w : perc);
        }
        value = np;
        if (value > 1)
          value = 1;
      }
      if (value > this._progress) {
        this._progress = value;
        this._callback(value);
      }
    }
  };

  // src/core/Downloader.ts
  var Downloader = class {
    common(owner, url, originalUrl, contentType, onProgress, onComplete) {
      let http = new XMLHttpRequest();
      http.open("get", url, true);
      http.responseType = contentType !== "arraybuffer" ? "text" : "arraybuffer";
      http.onload = (ev) => {
        let status = http.status;
        if (status === 200 || status === 204 || status === 0) {
          let ret;
          try {
            if (contentType === "json")
              ret = JSON.parse(http.responseText);
            else if (contentType === "xml")
              ret = new XML(http.responseText);
            else
              ret = http.response || http.responseText;
            onComplete(ret);
          } catch (err) {
            onComplete(null, err.message);
          }
        } else
          onComplete(null, http.statusText);
      };
      http.onerror = (ev) => {
        onComplete(null, http.statusText);
      };
      http.onabort = (ev) => {
        onComplete(null, "Request was aborted by user");
      };
      if (onProgress) {
        http.onprogress = (ev) => {
          if (ev.lengthComputable)
            onProgress(ev.loaded / ev.total);
        };
      }
      http.send();
      owner.$ref = http;
    }
    image(owner, url, originalUrl, onProgress, onComplete) {
      let image = new Image();
      image.onload = () => {
        image.onload = null;
        image.onerror = null;
        onComplete(image);
      };
      image.onerror = () => {
        image.onload = null;
        image.onerror = null;
        onComplete(null, "");
      };
      image.src = url;
      owner.$ref = image;
    }
    imageWithBlob(owner, data, originalUrl, onProgress, onComplete) {
      let blob = new Blob([data], { type: "application/octet-binary" });
      let url = URL.createObjectURL(blob);
      this.image(owner, url, originalUrl, onProgress, (ret) => {
        URL.revokeObjectURL(url);
        return ret;
      });
    }
    audio(owner, url, originalUrl, onProgress, onComplete) {
      let audio = document.createElement("audio");
      audio.crossOrigin = "";
      audio.oncanplaythrough = () => {
        audio.oncanplaythrough = null;
        audio.onerror = null;
        onComplete(audio);
      };
      audio.onerror = () => {
        audio.oncanplaythrough = null;
        audio.onerror = null;
        onComplete(null, "");
      };
      audio.src = url;
      owner.$ref = audio;
    }
  };

  // src/core/ResourceManager.ts
  var _ResourceManager = class _ResourceManager {
    constructor() {
      this.baseUrl = "";
      this.baseUrls = {};
      this.version = {};
      this.retryNum = 0;
      this.retryDelay = 0;
      this.maxLoader = 5;
      this.loadedMap = {};
      this.preLoadedMap = {};
      this._loadings = /* @__PURE__ */ new Map();
      this._queue = [];
      this._downloadings = /* @__PURE__ */ new Set();
    }
    static registerLoader(exts, cls, type) {
      let typeEntry;
      if (type) {
        typeEntry = _ResourceManager.typeMap[type];
        if (!typeEntry)
          _ResourceManager.typeMap[type] = typeEntry = { typeId: typeIdCounter++, loaderType: cls };
        else if (typeEntry.loaderType != cls)
          typeEntry = { typeId: typeEntry.typeId, loaderType: cls };
      } else
        typeEntry = { typeId: typeIdCounter++, loaderType: cls };
      for (let ext of exts) {
        let entry = _ResourceManager.extMap[ext];
        if (entry && type) {
          let i = entry.findIndex((e) => e.typeId == typeEntry.typeId);
          if (i == -1)
            entry.push(typeEntry);
          else
            entry[i].loaderType = cls;
        } else {
          _ResourceManager.extMap[ext] = [typeEntry];
        }
      }
    }
    get loading() {
      return this._loadings.size > 0;
    }
    load(url, arg1, onProgress) {
      let type;
      let options = dummyOptions2;
      if (typeof arg1 === "string")
        type = arg1;
      else if (arg1 != null) {
        type = arg1.type;
        options = arg1;
      }
      if (options.cache === false)
        options.ignoreCache = true;
      let promise;
      if (Array.isArray(url)) {
        let pd;
        if (onProgress)
          pd = new BatchProgress(onProgress);
        let promises = [];
        for (let i = 0; i < url.length; i++) {
          let url2 = url[i];
          if (!url2)
            continue;
          if (typeof url2 === "string") {
            promises.push(this._load1(url2, type, options, pd?.createCallback()));
          } else {
            promises.push(this._load1(
              url2.url,
              url2.type || type,
              options !== dummyOptions2 ? Object.assign({}, options, url2) : url2,
              pd?.createCallback()
            ));
          }
        }
        promise = Promise.all(promises);
      } else if (typeof url === "string")
        promise = this._load1(url, type, options, onProgress);
      else
        promise = this._load1(
          url.url,
          url.type || type,
          options !== dummyOptions2 ? Object.assign({}, options, url) : url,
          onProgress
        );
      return promise;
    }
    /** @internal */
    async _load1(url, type, options, onProgress) {
      if (url.startsWith("res://")) {
        let uuid = url.substring(6);
        const url2 = await UIPackage.assetDb.UUID_to_URL(uuid);
        if (url2)
          return this._load2(url2, uuid, type, options, onProgress);
        else {
          !options.silent && this.warnFailed(url, void 0, options.initiator?.url);
          return null;
        }
      } else {
        const uuid = await UIPackage.assetDb.URL_to_UUID(url);
        return this._load2(url, uuid, type, options, onProgress);
      }
    }
    /** @internal */
    async _load2(url, uuid, type, options, onProgress) {
      let { ext, typeId, main, loaderType } = this.getURLInfo(url, type, options.maybeType);
      if (!loaderType) {
        !options.silent && this.warnFailed(url, type ? `unsupported load type:${type}` : !url.startsWith("res://") ? `unsupported suffix` : "", options.initiator?.url);
        return null;
      }
      let formattedUrl = this.formatURL(url);
      let obsoluteRes;
      if (!options.ignoreCache) {
        let cacheRes = this._getRes(formattedUrl, type);
        if (cacheRes !== void 0) {
          if (cacheRes == null)
            return null;
          else {
            if (cacheRes.obsolute)
              obsoluteRes = cacheRes;
            if (!obsoluteRes && (!cacheRes.uuid || !uuid || uuid == cacheRes.uuid))
              return cacheRes;
          }
        }
      }
      let loadingKey = formattedUrl;
      if (!main)
        loadingKey += "@" + typeId;
      let task = this._loadings.get(loadingKey);
      if (task) {
        let p = options.initiator;
        while (p) {
          if (p === task)
            return Promise.resolve();
          p = p.options.initiator;
        }
        if (onProgress)
          task.onProgress.add(onProgress);
        return new Promise((resolve) => task.onComplete.add(resolve));
      }
      if (loadTaskPool.length > 0)
        task = loadTaskPool.pop();
      else
        task = new LoadTask();
      task.type = type;
      task.url = url;
      task.formattedUrl = formattedUrl;
      task.uuid = uuid;
      task.ext = ext;
      options = Object.assign(task.options, options);
      delete options.type;
      if (options.priority == null)
        options.priority = 0;
      if (onProgress)
        task.onProgress.add(onProgress);
      task.manager = this;
      task.obsoluteInst = obsoluteRes;
      let assetLoader = new loaderType();
      this._loadings.set(loadingKey, task);
      let content;
      try {
        content = await assetLoader.load(task);
      } catch (err) {
        content = null;
        !options.silent && this.warnFailed(url, err, options.initiator?.url);
      }
      if (content != null) {
        content.url = url;
        content.uuid = uuid;
      }
      if (task.options.cache !== false)
        this._cacheRes(formattedUrl, content, typeId, main);
      if (content != null)
        task.progress.update(-1, 1);
      task.onComplete.invoke(content);
      this._loadings.delete(loadingKey);
      task.reset();
      loadTaskPool.push(task);
      return content;
    }
    async fetch(url, contentType, onProgress, options) {
      options = options || dummyOptions2;
      let task = {
        originalUrl: url,
        url,
        contentType,
        priority: options.priority ?? 1,
        retryCnt: 0,
        onProgress,
        onComplete: null
      };
      if (options.useWorkerLoader) {
        task.useWorkerLoader = true;
        task.workerLoaderOptions = options.workerLoaderOptions;
      }
      if (options.blob)
        task.blob = options.blob;
      if (options.noRetry)
        task.retryCnt = -1;
      if (options.silent)
        task.silent = true;
      if (url.startsWith("res://")) {
        url = await UIPackage.assetDb.UUID_to_URL(url.substring(6));
        if (!url) {
          !task.silent && this.warnFailed(task.originalUrl);
          return null;
        }
      }
      return new Promise((resolve) => {
        task.url = this.formatURL(url);
        task.onComplete = resolve;
        this.queueToDownload(task);
      });
    }
    queueToDownload(item) {
      if (this._downloadings.size < this.maxLoader) {
        this.download(item);
        return;
      }
      let priority = item.priority;
      if (priority == 0)
        this._queue.push(item);
      else {
        let i = this._queue.findIndex((e) => e.priority < priority);
        if (i != -1)
          this._queue.splice(i, 0, item);
        else
          this._queue.push(item);
      }
    }
    download(item) {
      this._downloadings.add(item);
      let url = UIPackage.assetDb.postFormatURL(item.url);
      if (item.contentType == "image") {
        let preloadedContent = this.preLoadedMap[item.url];
        if (preloadedContent) {
          if (!(preloadedContent instanceof ArrayBuffer)) {
            this.completeItem(item, preloadedContent);
            return;
          }
          item.blob = preloadedContent;
        }
        if (item.blob) {
          _ResourceManager.downloader.imageWithBlob(item, item.blob, item.originalUrl, item.onProgress, (data, error) => {
            if (!data)
              item.retryCnt = -1;
            this.completeItem(item, data, error);
          });
        } else {
          _ResourceManager.downloader.image(item, url, item.originalUrl, item.onProgress, (data, error) => this.completeItem(item, data, error));
        }
      } else if (item.contentType == "sound") {
        _ResourceManager.downloader.audio(item, url, item.originalUrl, item.onProgress, (data, error) => this.completeItem(item, data, error));
      } else {
        let preloadedContent = this.preLoadedMap[item.url];
        if (preloadedContent) {
          this.completeItem(item, preloadedContent);
          return;
        }
        _ResourceManager.downloader.common(item, url, item.originalUrl, item.contentType, item.onProgress, (data, error) => this.completeItem(item, data, error));
      }
    }
    completeItem(item, content, error) {
      this._downloadings.delete(item);
      if (content) {
        if (this._downloadings.size < this.maxLoader && this._queue.length > 0)
          this.download(this._queue.shift());
        if (item.onProgress)
          item.onProgress(1);
        item.onComplete(content);
      } else if (item.retryCnt != -1 && item.retryCnt < this.retryNum) {
        item.retryCnt++;
        if (!item.silent)
          console.debug(`Retry to load ${item.url} (${item.retryCnt})`);
        Timers.add(this.retryDelay, 1, this.queueToDownload, this, item);
      } else {
        !item.silent && this.warnFailed(item.url);
        if (item.onProgress)
          item.onProgress(1);
        if (this._downloadings.size < this.maxLoader && this._queue.length > 0)
          this.download(this._queue.shift());
        item.onComplete(null);
      }
    }
    getURLInfo(url, type, maybeType) {
      let ext = url.startsWith("data:") ? "png" : getFileExtension(url);
      let extEntry;
      if (ext.length > 0)
        extEntry = _ResourceManager.extMap[ext];
      if (!extEntry && !type)
        type = maybeType || "image";
      let typeId;
      let main;
      let loaderType;
      if (type) {
        let typeEntry = _ResourceManager.typeMap[type];
        if (!typeEntry)
          return NullURLInfo;
        typeId = typeEntry.typeId;
        let i = 0;
        if (extEntry) {
          if (extEntry[0].typeId === typeId || (i = extEntry.findIndex((e) => e.typeId === typeId)) != -1) {
            main = i == 0;
            loaderType = extEntry[i].loaderType;
          } else {
            main = false;
            loaderType = typeEntry.loaderType;
          }
        } else {
          main = true;
          loaderType = typeEntry.loaderType;
        }
      } else {
        if (!extEntry)
          return NullURLInfo;
        main = true;
        typeId = extEntry[0].typeId;
        loaderType = extEntry[0].loaderType;
      }
      return { ext, main, typeId, loaderType };
    }
    warnFailed(url, err, initiatorUrl) {
      if (initiatorUrl)
        this.warn(`Failed to load '${url}' (in '${initiatorUrl}')`, err);
      else
        this.warn(`Failed to load '${url}'`, err);
    }
    warn(msg, err) {
      if (err)
        console.warn(msg, err);
      else
        console.warn(msg);
    }
    getRes(url, type) {
      url = this.formatURL(url);
      let ret = this._getRes(url, type);
      return ret || null;
    }
    /** @internal */
    _getRes(url, type) {
      let resArr = this.loadedMap[url];
      if (!resArr)
        return void 0;
      let ret;
      if (type) {
        let typeEntry = _ResourceManager.typeMap[type];
        if (!typeEntry)
          return void 0;
        if (resArr.length == 2) {
          if (resArr[0] == typeEntry.typeId)
            ret = resArr[1];
        } else {
          let i = resArr.indexOf(typeEntry.typeId);
          if (i != -1)
            ret = resArr[i + 1];
        }
      } else
        ret = resArr[1];
      if (ret != null && ret.destroyed)
        return void 0;
      else
        return ret;
    }
    cacheRes(url, data, type) {
      url = this.formatURL(url);
      let urlInfo = this.getURLInfo(url, type);
      if (urlInfo.typeId != null)
        this._cacheRes(url, data, urlInfo.typeId, urlInfo.main);
    }
    /** @internal */
    _cacheRes(url, data, typeId, main) {
      let entry = this.loadedMap[url];
      if (main) {
        if (entry) {
          entry[0] = typeId;
          entry[1] = data;
        } else
          entry = this.loadedMap[url] = [typeId, data];
      } else {
        if (entry) {
          let i = entry.findIndex((e) => e === typeId);
          if (i != -1)
            entry[i + 1] = data;
          else
            entry.push(typeId, data);
        } else
          entry = this.loadedMap[url] = [null, void 0, typeId, data];
      }
    }
    clearRes(url, checkObj) {
      url = this.formatURL(url);
      this._clearRes(url, checkObj);
    }
    /** @internal */
    _clearRes(url, checkObj) {
      let entry = this.loadedMap[url];
      if (!entry)
        return;
      if (checkObj) {
        if (!checkObj.destroyed)
          checkObj.__destroy(true);
        if (entry[1] == checkObj) {
          if (entry.length == 2)
            delete this.loadedMap[url];
          else
            entry[1] = void 0;
        } else {
          let i = entry.indexOf(checkObj);
          if (i == -1)
            return;
          if (entry.length == 4 && entry[0] == null)
            delete this.loadedMap[url];
          else
            entry.splice(i - 1, 2);
        }
      } else {
        delete this.loadedMap[url];
        if (entry.length > 2) {
          for (let i = 1; i < entry.length; i += 2) {
            let obj = entry[i];
            if (obj && !obj.destroyed)
              obj.__destroy(true);
          }
        } else {
          let obj = entry[1];
          if (obj && !obj.destroyed)
            obj.__destroy(true);
        }
      }
    }
    forEachResource(callback) {
      let loadedMap = this.loadedMap;
      for (let k in loadedMap) {
        let entry = loadedMap[k];
        if (entry.length == 2)
          callback(entry[1]);
        else
          entry.filter((e, i) => i % 2 == 1 && e != null).forEach(callback);
      }
    }
    cancelLoad(url) {
      if (!url)
        return;
      if (Array.isArray(url)) {
        for (let i = 0, n = url.length; i < n; i++) {
          this._cancelLoad(url[i]);
        }
      } else
        this._cancelLoad(url);
    }
    _cancelLoad(url) {
      url = this.formatURL(url);
      let i = this._queue.findIndex((item) => item.url == url);
      if (i != -1) {
        let item = this._queue[i];
        this._queue.splice(i, 1);
        item.onComplete(null);
      }
    }
    formatURL(url, base) {
      if (!url)
        return base || this.baseUrl || "";
      url = UIPackage.assetDb.formatURL(url);
      let char1 = url.charCodeAt(0);
      if (url.indexOf(":") == -1 && char1 !== 47) {
        let ver = this.version[url];
        if (ver != null) {
          let i = url.lastIndexOf(".");
          url = url.substring(0, i) + "-" + ver + url.substring(i);
        }
        if (base == null) {
          base = this.baseUrl;
          for (let k in this.baseUrls) {
            if (url.startsWith(k)) {
              if (k.charCodeAt(0) === 126)
                url = url.substring(k.length);
              base = this.baseUrls[k];
              break;
            }
          }
        }
        url = joinURL(base, url);
      }
      return url;
    }
    clearUnusedResources() {
      Resource._disposingCounter = 0;
      _clearRetry = 0;
      if (!UIPackage.resourceMgr.loading)
        this.destroyUnusedResources(true);
      else
        Timers.callLater(this.destroyUnusedResources, this);
    }
    destroyUnusedResources(force) {
      if (!force && UIPackage.resourceMgr.loading)
        return;
      Timers.remove(this.destroyUnusedResources, this);
      let destroyCnt = 0;
      for (let k in this.loadedMap) {
        let entry = this.loadedMap[k];
        for (let i = 1; i < entry.length; i += 2) {
          let obj = entry[i];
          if (obj && !obj.destroyed && !obj.lock && obj._ref === 0) {
            entry[i] = null;
            obj.destroy();
            destroyCnt++;
          }
        }
      }
      if (this.debug && destroyCnt > 0)
        console.debug(`destroyUnusedResources(${destroyCnt})`);
      if (destroyCnt > 0 && _clearRetry < 5) {
        _clearRetry++;
        Timers.callLater(this.destroyUnusedResources, Resource);
      }
    }
  };
  _ResourceManager.extMap = {};
  _ResourceManager.typeMap = {};
  _ResourceManager.downloader = new Downloader();
  var ResourceManager = _ResourceManager;
  var LoadTask = class {
    constructor() {
      this.options = {};
      this.onProgress = new Delegate();
      this.onComplete = new Delegate();
      this.progress = new BatchProgress((progress) => this.onProgress.invoke(progress));
    }
    reset() {
      for (let k in this.options)
        delete this.options[k];
      this.onProgress.clear();
      this.onComplete.clear();
      this.progress.reset();
      this.obsoluteInst = null;
    }
  };
  var typeIdCounter = 0;
  var NullURLInfo = { ext: null, typeId: null, main: false, loaderType: null };
  var loadTaskPool = [];
  var dummyOptions2 = {};
  var _clearRetry = 0;

  // src/component/ComponentDriver.ts
  var ComponentDriver = class {
    static callStart() {
      for (let ele of this.toStarts) {
        if (ele._status == 2) {
          ele._status = 3;
          try {
            ele.onStart();
          } catch (err) {
            console.log(err);
          }
        }
      }
      this.toStarts.clear();
    }
    static callUpdate() {
      for (let ele of this.onUpdates) {
        if (ele._status == 3) {
          try {
            ele.onUpdate();
          } catch (err) {
            console.log(err);
          }
        }
      }
    }
    static callLateUpdate() {
      for (let ele of this.onLateUpdates) {
        if (ele._status == 3) {
          try {
            ele.onLateUpdate();
          } catch (err) {
            console.log(err);
          }
        }
      }
    }
    static callDestroy() {
      for (let ele of this.toDestroys) {
        try {
          ele._destroy(true);
        } catch (err) {
          console.log(err);
        }
      }
      this.toDestroys.clear();
    }
    static add(comp) {
      if (comp._status == 1) {
        if (comp.onStart) {
          comp._status = 2;
          this.toStarts.add(comp);
        } else
          comp._status = 3;
      }
      if (comp.onUpdate)
        this.onUpdates.add(comp);
      if (comp.onLateUpdate)
        this.onLateUpdates.add(comp);
    }
    static remove(comp) {
      if (comp._status == 2)
        comp._status = 1;
      if (comp.onUpdate)
        this.onUpdates.delete(comp);
      if (comp.onLateUpdate)
        this.onLateUpdates.delete(comp);
    }
  };
  ComponentDriver.onUpdates = /* @__PURE__ */ new Set();
  ComponentDriver.onLateUpdates = /* @__PURE__ */ new Set();
  ComponentDriver.toStarts = /* @__PURE__ */ new Set();
  ComponentDriver.toDestroys = /* @__PURE__ */ new Set();

  // src/core/AssetDb.ts
  var _AssetDb = class _AssetDb {
    UUID_to_URL_sync(uuid) {
      return _AssetDb.uuidMap[uuid];
    }
    UUID_to_URL(uuid) {
      return Promise.resolve(_AssetDb.uuidMap[uuid]);
    }
    URL_to_UUID(url) {
      return Promise.resolve(_AssetDb.urlMap[url]);
    }
    formatURL(url) {
      if (url.startsWith("res://")) {
        let uuid = url.substring(6);
        let url2 = this.UUID_to_URL_sync(uuid);
        if (!url2)
          return url;
        url = url2;
      }
      return url;
    }
    postFormatURL(url) {
      return url;
    }
    getMeta(url, uuid) {
      if (uuid)
        return Promise.resolve(_AssetDb.metaMap[uuid]);
      else
        return Promise.resolve(null);
    }
    getI18nSettingsURL(id) {
      return _AssetDb.i18nUrlMap[id];
    }
  };
  _AssetDb.uuidMap = {};
  _AssetDb.urlMap = {};
  _AssetDb.metaMap = {};
  _AssetDb.i18nUrlMap = {};
  var AssetDb = _AssetDb;

  // src/core/UIPackage.ts
  var UIPackageImpl = class {
    constructor() {
      this.isPlaying = true;
      this.isPreview = false;
      this.language = window.navigator.language;
      this.resourceMgr = new ResourceManager();
      this.assetDb = new AssetDb();
      setInstance(this);
      customElements.define("ui-div", UIElement, { extends: "div" });
      Timers.addUpdate(() => {
        ComponentDriver.callStart();
        ComponentDriver.callUpdate();
        ComponentDriver.callLateUpdate();
        ComponentDriver.callDestroy();
      });
      TweenManager.__init__();
    }
    async createWidget(url, options, errors) {
      let res = await this.resourceMgr.load(url);
      if (res)
        return res.create(options, errors);
      else
        return null;
    }
    createWidgetSync(url, options, errors) {
      let res = this.resourceMgr.getRes(url);
      if (res)
        return res.create(options, errors);
      else {
        if (errors)
          errors.push(`getRes ${url} failed`);
        else
          console.warn(`getRes ${url} failed`);
        return null;
      }
    }
    playSound(src, volumeScale) {
    }
  };
  new UIPackageImpl();

  // src/core/TranslationsLoader.ts
  var TranslationsLoader = class {
    async load(task) {
      let url = task.url;
      const data = await task.manager.fetch(url, "json", task.progress.createCallback(0.2), task.options);
      if (!data)
        return null;
      let files = data.files || {};
      let jsonFile = files[UIPackage.language];
      if (!jsonFile && UIPackage.language != data.defaultLanguage)
        jsonFile = files[data.fallbackLanguage];
      let content;
      if (jsonFile) {
        content = await task.manager.fetch(jsonFile, "json", task.progress.createCallback(0.8), task.options);
        if (!content)
          return null;
      } else
        content = {};
      let inst;
      if (task.obsoluteInst && task.obsoluteInst.id == data.id)
        inst = task.obsoluteInst;
      else
        inst = Translations.create(data.id);
      inst.setContent(UIPackage.language, content);
      return inst;
    }
  };

  // src/core/TextureLoader.ts
  var _loadCounter = 0;
  var TextureLoader = class {
    async load(task) {
      let [img, meta] = await Promise.all([
        task.manager.fetch(task.url, "image", task.progress.createCallback(), task.options),
        UIPackage.assetDb.getMeta(task.url, task.uuid)
      ]);
      if (!img)
        return null;
      let obs = task.obsoluteInst;
      let tex = obs || new Texture();
      tex.source = img;
      tex.formattedUrl = task.formattedUrl;
      if (obs)
        tex.formattedUrl += (tex.formattedUrl.indexOf("?") != -1 ? "&" : "?") + _loadCounter++;
      if (meta) {
        tex.sizeGrid = meta.sizeGrid;
        tex.svgSize = meta.svgSize;
      }
      if (obs != null)
        obs.emit("instance_reload");
      return tex;
    }
  };

  // src/core/PrefabLoader.ts
  var PrefabLoader = class {
    async load(task) {
      let url = task.url;
      const data = await task.manager.fetch(url, "json", task.progress.createCallback(0.2), task.options);
      if (!data)
        return null;
      let basePath = getPath(task.url);
      let links = Prefab.parserAPI.collectResourceLinks(data, basePath);
      let options = Object.assign({}, task.options);
      options.initiator = task;
      delete options.cache;
      delete options.ignoreCache;
      const resArray = links.length > 0 ? await task.manager.load(links, options, task.progress.createCallback()) : null;
      return new Prefab(data, basePath, resArray);
    }
  };

  // src/component/Component.ts
  var Component = class {
    constructor() {
      this._hideFlags = 0;
      this._status = 0;
      this._enabled = true;
      this._initialize();
    }
    get hideFlags() {
      return this._hideFlags;
    }
    set hideFlags(value) {
      this._hideFlags = value;
    }
    /** @internal */
    _initialize() {
      this._extra = {};
    }
    hasHideFlag(flag) {
      return (this._hideFlags & flag) != 0;
    }
    get enabled() {
      return this._enabled;
    }
    set enabled(value) {
      if (this._enabled != value) {
        this._enabled = value;
        if (this.owner)
          this._setActive(value && this.owner.activeInHierarchy);
      }
    }
    get awaked() {
      return this._status > 0;
    }
    get destroyed() {
      return this._status == 4;
    }
    /** @internal */
    _setOwner(node) {
      if (this._status != 0) {
        throw "reuse a destroyed component";
      }
      this.owner = node;
      this._onAdded();
      this.onAdded();
    }
    /** @internal */
    _setActive(value) {
      if (value) {
        if (this._status == 0) {
          this._status = 1;
          if (UIPackage.isPlaying || this.runInEditor) {
            this._onAwake();
            this.onAwake();
          }
        }
        if (this._enabled && !this._enableState) {
          this._enableState = true;
          if (UIPackage.isPlaying || this.runInEditor) {
            ComponentDriver.add(this);
            this._onEnable();
          }
        }
      } else if (this._enableState) {
        this._enableState = false;
        if (UIPackage.isPlaying || this.runInEditor) {
          ComponentDriver.remove(this);
          this.owner.offAllCaller(this);
          this._onDisable();
        }
      }
    }
    destroy() {
      if (this._status == 4)
        return;
      if (this.owner)
        this.owner._destroyComponent(this);
    }
    /** @internal */
    _destroy(second) {
      if (second) {
        this._onDestroy();
        this.onDestroy();
        return;
      }
      this._setActive(false);
      this._status = 4;
      ComponentDriver.toDestroys.add(this);
    }
    /** @internal */
    _onAdded() {
    }
    /** @internal */
    _onAwake() {
    }
    /** @internal */
    _onEnable() {
      this.onEnable();
    }
    /** @internal */
    _onDisable() {
      this.onDisable();
    }
    /** @internal */
    _onDestroy() {
    }
    onAdded() {
    }
    onAwake() {
    }
    onEnable() {
    }
    onDisable() {
    }
    onDestroy() {
    }
  };

  // src/core/Module.ts
  var r = ClassUtils.regClass;
  r("Widget", Widget);
  r("Image", Image2);
  r("Loader", Loader);
  r("Shape", Shape);
  r("TextField", TextField);
  r("TextInput", TextInput);
  r("Box", Box);
  r("Panel", Panel);
  r("Label", Label);
  r("Button", Button);
  r("ComboBox", ComboBox);
  r("List", List);
  r("ProgressBar", ProgressBar);
  r("ScrollBar", ScrollBar);
  r("Slider", Slider);
  r("Tree", Tree);
  r("Window", Window);
  r("GRoot", GRoot);
  r("Component", Component);
  r("Controller", Controller);
  r("Relation", Relation);
  r("Gear", Gear);
  r("GearDisplay", GearDisplay);
  r("GearBool", GearBool);
  r("GearNumber", GearNumber);
  r("GearString", GearString);
  r("GearColor", GearColor);
  r("GearHexColor", GearHexColor);
  r("GearTweenConfig", GearTweenConfig);
  r("TextStyle", TextStyle);
  r("Selection", Selection);
  r("Scroller", Scroller);
  r("Record", Object);
  r("SRect", SRect);
  r("SEllipse", SEllipse);
  r("SLine", SLine);
  r("SImage", SImage);
  r("Color", Color);
  r("Rect", Rect);
  r("Vec2", Vec2);
  r("Texture", Texture);
  r("Layout", Layout);
  r("StretchParam", StretchParam);
  r("Resource", Resource);
  r("Prefab", Prefab);
  r("ItemData", class extends Object {
  });
  ResourceManager.registerLoader(["png", "jpg", "jpeg", "svg"], TextureLoader, "image");
  ResourceManager.registerLoader(["widget"], PrefabLoader, "prefab");
  ResourceManager.registerLoader(["i18ns"], TranslationsLoader);
  return __toCommonJS(stdin_exports);
})();
