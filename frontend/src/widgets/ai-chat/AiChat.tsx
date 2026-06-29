'use client'

import { useState, useRef, useEffect } from 'react'
import { cn, hasActionPlan } from '@/shared/utils'
import { AiService } from '@/shared/api'
import { useTasksStore } from '@/shared/store'
import { Button } from '@/shared/UI'

import c from './ai-chat.module.scss'


type TMessage = {
  id: number
  role: 'user' | 'ai'
  text: string
}


interface Props {
  contactId: string
  contactName: string
}

const AiChat = ({ contactId, contactName }: Props) => {
  const createTask = useTasksStore(s => s.createTask)

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<TMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set())

  const bottomRef = useRef<HTMLDivElement>(null)
  const msgIdRef = useRef(0)

  useEffect(() => {
    let mounted = true
    msgIdRef.current = 0
    AiService.getHistory(contactId).then(({ data }) => {
      if (!mounted) return
      setMessages(data.history.map((m, i) => ({
        id: i + 1,
        role: m.role === 'assistant' ? 'ai' : 'user',
        text: m.content,
      })))
      msgIdRef.current = data.history.length
    }).catch(() => {})
    return () => { mounted = false }
  }, [contactId])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const clearChat = async () => {
    await AiService.clearHistory(contactId)
    setMessages([])
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: TMessage = { id: ++msgIdRef.current, role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data } = await AiService.sendMessage(contactId, text)
      setMessages(prev => [...prev, { id: ++msgIdRef.current, role: 'ai', text: data.text }])
    } catch {
      setMessages(prev => [...prev, { id: ++msgIdRef.current, role: 'ai', text: 'Не удалось подключиться к серверу.' }])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <div
        className={c.overlay}
        data-open={open}
        onClick={() => setOpen(false)}
      />

      <div
        className={c.panel}
        data-open={open}
      >

        <button
          className={c.tab}
          onClick={() => setOpen(prev => !prev)}
          aria-label={open ? 'Закрыть чат' : 'Открыть чат'}
        >
          <span>ИИ чат</span>
          <svg
            className={c.tab_arrow}
            data-open={open}
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className={c.panel_content}>

          <div className={c.header}>
            <div className={c.header_info}>
              <span className={c.avatar}>ИИ</span>
              <div>
                <p className={c.title}>ИИ-ассистент</p>
                <p className={c.subtitle}>{contactName}</p>
              </div>
            </div>
            {messages.length > 0 &&
              <Button
                variant="danger"
                iconOnly
                className={c.clear_btn}
                onClick={clearChat}
                disabled={loading}
                title="Очистить чат"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            }
          </div>

          <div className={c.messages}>
            {messages.map(msg => (
              <div key={msg.id} className={cn(c.message, c[msg.role])}>
                {msg.role === 'ai'
                  ? (
                    <>
                      <span className={c.msg_avatar}>ИИ</span>
                      <div className={c.ai_body}>
                        <p>{msg.text}</p>
                        {hasActionPlan(msg.text) &&
                          <button
                            className={c.add_task_btn}
                            data-done={addedIds.has(msg.id)}
                            disabled={addedIds.has(msg.id) || generatingIds.has(msg.id)}
                            onClick={async () => {
                              setGeneratingIds(prev => new Set(prev).add(msg.id))
                              try {
                                const { data: meta } = await AiService.generateTaskMeta(msg.text)
                                await createTask({
                                  title: meta.title,
                                  description: msg.text,
                                  status: 'no_deadline',
                                  priority: meta.priority as import('@/shared/types/tasks.types').TTaskPriority,
                                  contact_id: contactId,
                                  deadline: meta.deadline,
                                })
                                setAddedIds(prev => new Set(prev).add(msg.id))
                              } catch {
                                // ошибка создания уже показана через showAlert в сторе
                              } finally {
                                setGeneratingIds(prev => { const s = new Set(prev); s.delete(msg.id); return s })
                              }
                            }}
                          >
                            {addedIds.has(msg.id) ? '✓ Задача добавлена' : generatingIds.has(msg.id) ? 'Создание...' : '+ Добавить задачу'}
                          </button>
                        }
                      </div>
                    </>
                  )
                  : <p>{msg.text}</p>
                }
              </div>
            ))}
            {loading &&
              <div className={cn(c.message, c.ai)}>
                <span className={c.msg_avatar}>ИИ</span>
                <p className={c.typing}><span /><span /><span /></p>
              </div>
            }
            <div ref={bottomRef} />
          </div>

          <div className={c.input_area}>
            <textarea
              className={c.textarea}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Напишите сообщение..."
              rows={1}
              disabled={loading}
            />
            <Button
              variant="primary"
              className={c.send_btn}
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Отправить"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>

        </div>
      </div>
    </>
  )
}

export { AiChat }
