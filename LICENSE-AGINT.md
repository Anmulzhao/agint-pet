# AGINT 新增代码授权

本文件覆盖本仓中由 AGINT（anmul）**从零编写**的文件。

- 许可：MIT
- 版权：Copyright (c) 2026 anmul
- 完整条款：见同目录 `LICENSE-MIT-AGINT.md`（MIT 全文）

本文件**不**覆盖以下内容：

1. 上游 `zhu1090093659/dsh-pet` 的代码。许可为 Apache-2.0，见仓库根 `LICENSE`。
2. 对上游 Apache-2.0 文件的任何修改。这些修改同样保留 Apache-2.0。
3. `assets/` 下的内置宠物资产。各资产条款见其 `pet.json` 的 `license` 字段，以及 `THIRD_PARTY_NOTICES.md`。

## 怎么判断一个文件属于哪一类

判据一句话：**这个文件如果上游没有它，你能不能独立写出来？**

| 情况 | 许可 |
|---|---|
| 全新文件，仓库里没有对应的上游文件 | MIT |
| 上游文件，本 fork 做了改动 | Apache-2.0 |
| 上游文件，未改动 | Apache-2.0 |
| `assets/` 下的资产 | 看各自 `pet.json` |
| `THIRD_PARTY_NOTICES.md`、`LICENSE` | 原样保留，不改动 |

「改了几行」不等于「变成我的文件」。一份 500 行的上游文件加了 3 行，主体仍然是 Apache-2.0。

## 上游许可依据

Apache-2.0 §4 最后一段（见仓库根 `LICENSE` 末段）：

> You may add Your own copyright statement to your modifications, and may provide
> additional or different license terms and conditions for use, reproduction, or
> distribution of Your modifications, or for any Derivative Works thereof as a whole,
> provided Your use, reproduction, and distribution of the Work otherwise complies with
> the conditions stated in this License.

即：允许为自己的修改另加条款，条件是仍然履行 §4(a)(b)(c)(d)。换不掉的是这四条。

## 改过的上游文件还须做一件事

Apache-2.0 §4(b) 要求改过的文件带显著变更声明。写法见本文件下节。

```ts
// SPDX-License-Identifier: Apache-2.0
// 本文件来自 dsh-pet 上游，许可 Apache-2.0。
// AGINT 修改记录：
//   YYYY-MM-DD  改了什么。
// 上游基线：https://github.com/zhu1090093659/dsh-pet @ 36f6056
```

## 新增文件的头

```ts
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 anmul
// AGINT 新增文件。许可见 LICENSE-AGINT.md。
```

```markdown
<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2026 anmul -->
```

## 本 fork 已知的受限内置资产

以下 4 个资产的条款不由仓库根 `LICENSE` 覆盖，也**不因** AGINT 新增代码是 MIT 而改变：

| 目录 | `pet.json` 声明 | 附加约束 |
|---|---|---|
| `assets/doro/` | MIT | 角色权利归 SHIFT UP，限个人非商业使用，不得销售或商用 |
| `assets/miku/` | MIT | 角色权利归 Crypton Future Media，受 Piapro Character License 约束 |
| `assets/starry-doll/` | CC-BY-NC-SA-4.0 | 非商业 + 相同方式共享 |
| `assets/long-niang/` | CC-BY-NC-SA-4.0 | 非商业 + 相同方式共享 |

**打包发布、对外分发、转公开仓之前必须先剔除这 4 个。** 证据见 `THIRD_PARTY_NOTICES.md` 第 53-81 行。
