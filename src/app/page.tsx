import Image from "next/image";
import { Chat } from "@/components/chat";
import { ChatCta } from "@/components/chat-cta";

const problems = [
  "Клиент написал, но ответ получил слишком поздно",
  "Менеджер забыл вернуться к заявке",
  "Информация потерялась между сотрудниками",
  "Задача зависит от конкретного сотрудника",
  "Руководитель снова контролирует рутину вручную",
  "Клиент повторно сообщает одни и те же данные"
];

const capabilities = [
  ["01", "Входящие обращения", "Получает запрос, уточняет детали и передаёт сотруднику уже подготовленную информацию."],
  ["02", "AI-секретарь", "Согласовывает время, проверяет календарь, создаёт встречу и собирает контекст."],
  ["03", "Поддержка продаж", "Выясняет потребность, отвечает на типовые вопросы и передаёт клиента менеджеру."],
  ["04", "Внутренние знания", "Помогает сотрудникам находить информацию в разрешённых каталогах и документах."],
  ["05", "Контроль операций", "Напоминает, запрашивает недостающие сведения и передаёт исключения человеку."],
  ["06", "Связь систем", "Передаёт данные между существующими сервисами в рамках разрешённых интеграций."]
];

export default function Home() {
  return <main>
    <header className="header">
      <a href="#top" aria-label="AI-Run — на главную"><Image src="/logo.svg" width={192} height={60} alt="AI-Run" priority /></a>
      <nav aria-label="Основная навигация">
        <a href="#tasks">Какие задачи решаем</a><a href="#capabilities">Как это работает</a><a href="#examples">Примеры</a><a href="#process">Как работаем</a>
      </nav>
      <ChatCta className="button button-small">Назначить созвон</ChatCta>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><span /> AI-агенты для реальных бизнес-процессов</p>
        <h1>В вашем бизнесе есть работа, которую <em>никто не успевает</em> делать?</h1>
        <ul className="hero-problems" aria-label="Типичные проблемы">
          <li>Клиенту вовремя не ответили</li>
          <li>Заявку не обработали</li>
          <li>Руководителю пришлось вмешаться самому</li>
        </ul>
        <p className="lead">Мы разрабатываем AI-агентов, которые берут на себя такие незакрытые функции бизнес-процесса.</p>
        <div className="hero-actions"><ChatCta>Обсудить мою задачу <span>↗</span></ChatCta><p>Не нужно готовить техническое задание. Сначала разберём, где возникает проблема и может ли её решить AI-агент.</p></div>
      </div>
      <div id="secretary" className="chat-wrap" tabIndex={-1}><Chat /></div>
    </section>

    <section className="losses" id="tasks">
      <div><p className="section-index">01 / ПРОБЛЕМА</p><h2>Где бизнес теряет<br/>заявки и время</h2></div>
      <div className="problem-list">{problems.map((item, index) => <article key={item}><span>0{index + 1}</span><p>{item}</p></article>)}</div>
      <p className="statement">Если функция регулярно проваливается между сотрудниками, <strong>часть процесса можно передать AI-агенту.</strong></p>
    </section>

    <section className="capabilities" id="capabilities">
      <p className="section-index">02 / ВОЗМОЖНОСТИ</p><div className="section-heading"><h2>Что может делать<br/>AI-агент</h2><p>Не заменять людей любой ценой, а закрывать конкретную функцию — точно, стабильно и под контролем.</p></div>
      <div className="cap-grid">{capabilities.map(([n,t,d]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>

    <section className="principle">
      <p className="section-index">03 / ПРИНЦИП</p><h2>Не автоматизируем<br/><em>всё подряд.</em></h2>
      <p>Сначала определяем конкретную функцию, которая нарушает бизнес-процесс. Только после этого выбираем способ автоматизации.</p>
      <div className="not-needed"><span>Вам не нужно</span><ul><li>знать терминологию AI</li><li>выбирать тип агента</li><li>иметь готовое ТЗ</li><li>понимать архитектуру</li></ul></div>
    </section>

    <section className="examples" id="examples">
      <p className="section-index">04 / РАБОТАЮЩИЕ ПРИМЕРЫ</p><h2>Не презентации.<br/>Работающие сервисы.</h2>
      <div className="example-grid">
        <a href="https://tp.ai-run.ru" target="_blank" rel="noreferrer"><span className="project-status">Работает</span><h3>Поиск деталей<br/>для спецтехники</h3><p>AI-агент помогает найти нужную запчасть по каталогу и подготавливает обращение.</p><b>Посмотреть ↗</b></a>
        <a href="https://cover-letter.ai-run.ru" target="_blank" rel="noreferrer"><span className="project-status">Работает</span><h3>Сопроводительные<br/>письма под вакансию</h3><p>AI анализирует требования и создаёт точное письмо на основе опыта кандидата.</p><b>Посмотреть ↗</b></a>
      </div>
    </section>

    <section className="process" id="process">
      <p className="section-index">05 / ПРОЦЕСС</p><h2>Как начинается работа</h2>
      <ol>{[
        ["Разбираем ситуацию", "Определяем, где возникает нарушение процесса."], ["Определяем функцию", "Фиксируем конкретную работу для AI-агента."], ["Предлагаем решение", "Описываем сценарий и нужные интеграции."], ["Проверяем", "Сначала испытываем ключевой сценарий."], ["Интегрируем", "Встраиваем агента без новой ручной работы."]
      ].map(([t,d],i)=><li key={t}><span>0{i+1}</span><h3>{t}</h3><p>{d}</p></li>)}</ol>
    </section>

    <section className="final-cta"><p className="eyebrow"><span /> Начнём с конкретной проблемы</p><h2>Не уверены, какую задачу<br/>можно передать AI?</h2><p>Расскажите, где сейчас возникают задержки, потерянные задачи или постоянный ручной контроль. Начать можно без технического задания.</p><ChatCta className="button light">Найти, что можно передать AI <span>↗</span></ChatCta></section>
    <footer><Image src="/logo.svg" width={160} height={50} alt="AI-Run"/><p>AI-агенты для бизнеса</p><a href="/privacy-policy">Политика обработки персональных данных</a><span>© 2026 AI-Run</span></footer>
  </main>;
}
