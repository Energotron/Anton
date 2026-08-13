# Космические Рейнджеры 3: Дети Эльтана

Настоящий KR3-концепт: мрачная, сюжетная, системная космическая RPG/strategy sandbox в духе **Space Rangers**, но с упором на **Умную Дипломатию**, войну в нескольких измерениях и объединение несовместимых рас.

## High Concept
Спустя 250 лет после КР2 галактика снова стоит на краю уничтожения. Махпеллы вернулись, а их оружие **«Исказитель Реальности»** стирает целые системы. Единственная надежда — древнее пророчество гаальцев о **Детях Эльтана**, существах, способных объединить несовместимое и создать невозможный альянс.

Игрок — рейнджер-визионер, который должен собрать этот альянс, найти Келлера, войти в глубокий гипер и вернуть в обычный космос силы, ушедшие в тень черных дыр.

## Core Dimensions (Z-Mechanic)
- **Обычный космос** — дипломатия, торговля, исследования, политика Коалиции.
- **Глубокое гиперпространство** — война Келлера, аномалии, скрытные операции, диверсии.
- **Режим Чёрной Дыры** — сюрреалистичные теневые миры, древние флоты, утерянные технологии.

## Main Pillars
- **Smart Diplomacy System** — переговоры, психологические профили, блеф, подкуп, баланс интересов.
- **Alliance Grid** — управление внутренним напряжением альянса и риском раскола.
- **Dynamic Guerrilla War Map** — координация атак в обычном космосе, гипере и теневых зонах.
- **Text Quest Legacy** — большие ветвящиеся квесты, как в классических КР.
- **Solo + Online split** — сюжетная кампания отдельно, галактическая сеть отдельно.

## Modes
### 1. Solo Campaign
Сюжетное, оффлайн или псевдо-оффлайн прохождение:
- глубокий лор
- дипломатия и сюжетные развилки
- поиск Келлера
- сбор альянса
- война против Махпелл

### 2. Galactic Network (Online)
Онлайн-режим для долгой жизни проекта:
- PvE спецоперации
- PvP гипер-арены
- кланы и базы
- живой рынок
- кооперативные рейды в чёрные дыры

## Stack
- **Godot 4** — клиент / core gameplay prototype
- **GitHub** — repo, docs, iteration, workflows
- **Manus AI** — external testing / edge-case hunting
- **ClawX / OpenClaw** — optional AI assistant layer for bots, balancing, and system design
- **Blender** — visual pipeline later

## Repository Structure
- `docs/` — game design, lore, systems, roadmap
- `game/` — Godot project
- `data/` — structured data for factions, systems, economy
- `quests/` — story quests and encounter definitions

## WebGL Build — Agent Access
**Актуальная WebGL-сборка SR3:** [sr3-webgl.zip](https://www.dropbox.com/pri/get/sr3-webgl.zip?_subject_uid=1096373025&w=AAAkaQ5e6s1QkAHgdsdu5huPndBJFVN5bvm4vE8YJLvCeg)

> **Для AI-агентов:** используйте этот ZIP как reference build / runtime artifact для анализа WebGL-архитектуры, тестирования, портирования и дальнейшей итерации SR3. Не заменяйте существующий `game/` без проверки текущего состояния репозитория.

## Current Focus
1. зафиксировать лор и основную арку
2. описать Smart Diplomacy System
3. определить MVP для соло-кампании
4. подготовить foundations для online-режима без расползания scope
5. анализировать и интегрировать WebGL build из `sr3-webgl.zip`
