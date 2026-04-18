# Agent Index

このディレクトリは、LLM用のagent運用情報をまとめるための入口です。

## Documents

- [Docs Index](../docs/index.md): ドキュメント全体の索引
- [Overview](../docs/overview.md): このagentディレクトリの目的と基本方針
- [Docs Policy](../docs/docs-policy.md): ドキュメントの置き方と更新ルール
- [Skills Policy](../docs/skills-policy.md): Skillの記述方針

## Skills

- `skills/`配下の各Skillは、詳細説明をルートの`docs/`内の対応ドキュメントへ委譲する
- Skillファイルには、Skill固有の目的、入出力、制約、実行手順だけを書く

## Authoring Rule

- まずルートの`docs/`に正本を書く
- `agent.md`は索引として保つ
- Skill固有でない説明は`skills/`へ重複して書かない
