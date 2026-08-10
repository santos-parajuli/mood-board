"use client"

import { Bold, Minus, Plus, Trash2 } from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import React, { useRef, useState } from "react"

import Draggable, { DraggableData, DraggableEvent } from "react-draggable"

import { CanvasTextItem, DraggableTextProps } from "@/lib/types"

function DraggableTextComponent({
  text,
  onStop,
  onDrag,
  onClick,
  isSelected,
  onUpdateText,
  onDeleteItem,
}: DraggableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(text.text)
  const nodeRef = useRef<HTMLDivElement>(null)

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    onUpdateText(text.id, { text: inputValue })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const toggleBold = () => {
    onUpdateText(text.id, {
      fontWeight: text.fontWeight === "bold" ? "normal" : "bold",
    })
  }

  const increaseFontSize = () => {
    onUpdateText(text.id, { fontSize: text.fontSize + 2 })
  }

  const decreaseFontSize = () => {
    onUpdateText(text.id, {
      fontSize: Math.max(8, text.fontSize - 2),
    })
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: text.x, y: text.y }}
      onStop={(e: DraggableEvent, ui: DraggableData) => onStop(e, ui, text.id)}
      onDrag={(e: DraggableEvent, ui: DraggableData) => onDrag(e, ui, text.id)}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        onDragStart={(e) => e.preventDefault()}
        className={`absolute cursor-grab p-2 ${isSelected ? "border-2 border-blue-500" : ""}`}
        onClick={(e: React.MouseEvent) => onClick(e, text.id)}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            autoFocus
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()} // Stop selection breaks during drag setup
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="border-none bg-transparent focus:outline-none"
            style={{
              fontWeight: text.fontWeight,
              fontSize: `${text.fontSize}px`,
            }}
          />
        ) : (
          <ContextMenu>
            <ContextMenuTrigger className="block h-full w-full">
              <p
                style={{
                  fontWeight: text.fontWeight,
                  fontSize: `${text.fontSize}px`,
                }}
              >
                {text.text}
              </p>
            </ContextMenuTrigger>

            <ContextMenuContent>
              <ContextMenuItem onClick={toggleBold}>
                <Bold className="mr-2 h-4 w-4" /> Bold
              </ContextMenuItem>
              <ContextMenuItem onClick={increaseFontSize}>
                <Plus className="mr-2 h-4 w-4" /> Increase Font
              </ContextMenuItem>
              <ContextMenuItem onClick={decreaseFontSize}>
                <Minus className="mr-2 h-4 w-4" /> Decrease Font
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onDeleteItem(text.id)}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )}
      </div>
    </Draggable>
  )
}

const DraggableText = React.memo(DraggableTextComponent)
export default DraggableText
