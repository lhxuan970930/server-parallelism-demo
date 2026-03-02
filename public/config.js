// 使用者只需要修改這個檔案即可（純靜態版本，不需要後端）
//
// 檔案結構建議：
// - 模特兒：./模特兒/model.png（正面）
// - 裝扮：./裝扮/*.png（預設單張 PNG = 正面；背面可選）
//
// category 建議使用：accessories / top / bottom / socks / shoes
// accessories 建議加 subcategory（會對應到不同「飾品槽」）：
// headwear / earrings / necklace / glasses / bag（可自行新增其他 key）

window.WARDROBE_CONFIG = {
  baseModel: {
    front: "./模特兒/model.png",
    back: "",
  },
  items: [
    // 範例（把註解拿掉並改成你的檔名即可）：
    // {
    //   id: "top_hoodie",
    //   name: "帽T",
    //   category: "top",
    //   front: "./裝扮/帽T.png",
    //   back: "",
    // },
    // {
    //   id: "acc_cap",
    //   name: "帽子",
    //   category: "accessories",
    //   subcategory: "headwear",
    //   front: "./裝扮/帽子.png",
    //   back: "",
    // },
  ],
};
