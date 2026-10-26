import assert from "node:assert/strict";
import test from "node:test";

import WeChatEmojis, {
  EMOJI_CATEGORIES,
  EmojiCategory,
  getAllEmojis,
  getEmojiInfo,
  getEmojiNames,
  getEmojiPath,
  getEmojiUrl,
  getEmojisByCategory,
  getRandomEmoji,
  hasEmoji,
  searchEmojis
} from "../dist/index.js";

test("返回的数组是新的，调用方 push 不会改到库内部", () => {
  const first = getAllEmojis();
  const before = first.length;
  first.push({ name: "注入的", category: EmojiCategory.OTHER, path: "assets/other/注入的.png" });

  assert.equal(getAllEmojis().length, before);
});

test("返回的对象是副本，改 name 不会影响下次查询", () => {
  const [entry] = getAllEmojis();
  assert.ok(entry);
  const originalName = entry.name as Parameters<typeof getEmojiInfo>[0];
  entry.name = "被改掉了";

  assert.equal(getEmojiInfo(originalName)?.name, originalName);
});

test("同类别的两次调用不共享数组引用", () => {
  const first = getEmojisByCategory(EmojiCategory.FACE);
  const second = getEmojisByCategory(EmojiCategory.FACE);

  assert.notEqual(first, second);
  assert.equal(first.length, second.length);
});

test("清空 EMOJI_CATEGORIES 的数组不会改到库内部", () => {
  const expected = getEmojisByCategory(EmojiCategory.FACE).length;
  EMOJI_CATEGORIES[EmojiCategory.FACE].length = 0;

  assert.equal(getEmojisByCategory(EmojiCategory.FACE).length, expected);
});

test("EMOJI_CATEGORIES 的每个类别与按类别查询结果一致", () => {
  for (const category of Object.values(EmojiCategory)) {
    const fromConstant = EMOJI_CATEGORIES[category];
    const fromFunction = getEmojisByCategory(category);
    assert.deepEqual(
      fromConstant.map((emoji) => emoji.name),
      fromFunction.map((emoji) => emoji.name)
    );
  }
});

test("总共 109 个表情，五个类别加起来等于总数", () => {
  const all = getAllEmojis();
  assert.equal(all.length, 109);

  const sum = Object.values(EmojiCategory).reduce(
    (total, category) => total + getEmojisByCategory(category).length,
    0
  );
  assert.equal(sum, all.length);
});

test("getEmojiPath 返回相对路径，getEmojiUrl 返回绝对 URL", () => {
  assert.equal(getEmojiPath("旺柴"), "assets/face/旺柴.png");
  assert.equal(
    getEmojiUrl("旺柴"),
    "https://cdn.jsdelivr.net/npm/wechat-emojis@2/assets/face/%E6%97%BA%E6%9F%B4.png"
  );
});

test("不存在的名字返回 null，hasEmoji 返回 false", () => {
  const missing = "不存在" as Parameters<typeof getEmojiPath>[0];
  assert.equal(getEmojiPath(missing), null);
  assert.equal(getEmojiUrl(missing), null);
  assert.equal(getEmojiInfo(missing), null);
  assert.equal(hasEmoji(missing), false);
});

test("searchEmojis 只做中文名子串匹配", () => {
  const results = searchEmojis("笑");
  assert.ok(results.length > 0);
  for (const emoji of results) assert.ok(emoji.name.includes("笑"));

  assert.deepEqual(searchEmojis("不存在的词"), []);
});

test("getEmojiNames 与类别查询结果一致", () => {
  assert.equal(getEmojiNames().length, 109);
  assert.deepEqual(
    getEmojiNames(EmojiCategory.GESTURE),
    getEmojisByCategory(EmojiCategory.GESTURE).map((emoji) => emoji.name)
  );
});

test("getRandomEmoji 在指定类别内取到值", () => {
  const emoji = getRandomEmoji(EmojiCategory.ANIMAL);
  assert.equal(emoji.category, EmojiCategory.ANIMAL);
  assert.ok(getEmojiNames(EmojiCategory.ANIMAL).includes(emoji.name));
});

test("默认导出的函数与命名导出一致", () => {
  assert.equal(WeChatEmojis.getEmojiPath, getEmojiPath);
  assert.equal(WeChatEmojis.getEmojiUrl, getEmojiUrl);
  assert.equal(WeChatEmojis.getAllEmojis, getAllEmojis);
  assert.equal(WeChatEmojis.EMOJI_CDN_BASE, "https://cdn.jsdelivr.net/npm/wechat-emojis@2");
});
