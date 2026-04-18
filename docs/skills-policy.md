# Skills Policy

## Principle

Skillには、そのSkillにしか属さない情報だけを書く。

例:

- 何をするSkillか
- どの入力を期待するか
- どの出力を返すか
- そのSkill特有の制約
- そのSkill特有の実行手順

以下は原則として`docs/`へ置く。

- 共通用語
- 全体アーキテクチャ
- 共通運用ルール
- 他Skillでも使う判断基準

## Skill File Pattern

各Skillファイルは、少なくとも次を持つ。

- 概要
- 参照ドキュメント
- Skill固有ルール

## Reference Rule

Skillファイルでは、詳細を直接長く書かず、`docs/`内の文書へリンクする。
