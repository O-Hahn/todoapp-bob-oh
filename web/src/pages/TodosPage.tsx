import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Modal,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Checkbox,
  Tag,
  InlineNotification,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  DataTableSkeleton,
  Tile,
} from '@carbon/react';
import {
  Add,
  Edit,
  TrashCan,
  Alarm,
  CheckmarkOutline,
  Calendar,
} from '@carbon/icons-react';
import { TodoItem, SortBy, SortOrder } from '../types/index.js';
import {
  fetchTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from '../api/todoApi.js';

export const TodosPage: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [order, setOrder] = useState<SortOrder>('desc');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<TodoItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTodos = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchTodos(sortBy, order);
      setTodos(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [sortBy, order]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingTodo(null);
    setFormTitle('');
    setFormDescription('');
    setFormDueDate('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (todo: TodoItem) => {
    setModalMode('edit');
    setEditingTodo(todo);
    setFormTitle(todo.title);
    setFormDescription(todo.description || '');
    setFormDueDate(
      todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 10) : '',
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async () => {
    if (!formTitle.trim()) {
      setFormError('Title is required');
      return;
    }

    setFormError(null);
    setSubmitting(true);

    const isoDueDate = formDueDate ? new Date(formDueDate).toISOString() : null;

    try {
      if (modalMode === 'create') {
        const created = await createTodo({
          title: formTitle,
          description: formDescription,
          dueDate: isoDueDate,
        });
        setTodos((prev) => [created, ...prev]);
      } else if (editingTodo) {
        const updated = await updateTodo(editingTodo._id, {
          title: formTitle,
          description: formDescription,
          dueDate: isoDueDate,
        });
        setTodos((prev) =>
          prev.map((t) => (t._id === updated._id ? updated : t)),
        );
      }
      setIsModalOpen(false);
      loadTodos();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save todo item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (todo: TodoItem) => {
    const updatedStatus = !todo.completed;

    // Optimistic update
    setTodos((prev) =>
      prev.map((t) =>
        t._id === todo._id ? { ...t, completed: updatedStatus } : t,
      ),
    );

    try {
      await updateTodo(todo._id, { completed: updatedStatus });
    } catch (err: any) {
      // Rollback on error
      setTodos((prev) =>
        prev.map((t) =>
          t._id === todo._id ? { ...t, completed: todo.completed } : t,
        ),
      );
      setError('Failed to update completed status: ' + err.message);
    }
  };

  const openDeleteModal = (todo: TodoItem) => {
    setDeleteTarget(todo);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTodo(deleteTarget._id);
      setTodos((prev) => prev.filter((t) => t._id !== deleteTarget._id));
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete todo item');
    } finally {
      setDeleting(false);
    }
  };

  const isOverdue = (todo: TodoItem) => {
    if (todo.completed || !todo.dueDate) return false;
    return new Date(todo.dueDate).getTime() < Date.now();
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'None';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const headers = [
    { key: 'status', header: 'Status' },
    { key: 'title', header: 'Task' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'createdAt', header: 'Created' },
    { key: 'actions', header: 'Actions' },
  ];

  const tableRows = todos.map((todo) => ({
    id: todo._id,
    status: (
      <Checkbox
        id={`table-check-${todo._id}`}
        labelText=""
        aria-label={`Mark ${todo.title} as ${todo.completed ? 'open' : 'completed'}`}
        checked={todo.completed}
        onChange={() => handleToggleComplete(todo)}
      />
    ),
    title: (
      <div>
        <div
          className={`table-todo-title ${todo.completed ? 'completed' : ''}`}
        >
          {todo.title}
        </div>
        {todo.description && (
          <div
            className="meta-text meta-text--pre"
          >
            {todo.description}
          </div>
        )}
      </div>
    ),
    dueDate: (
      <div>
        {todo.dueDate ? (
          <Tag
            type={
              todo.completed ? 'cool-gray' : isOverdue(todo) ? 'red' : 'blue'
            }
            renderIcon={isOverdue(todo) ? Alarm : Calendar}
          >
            {formatDate(todo.dueDate)}
            {isOverdue(todo) && !todo.completed ? ' (Overdue)' : ''}
          </Tag>
        ) : (
          <span className="text-secondary">No due date</span>
        )}
      </div>
    ),
    createdAt: (
      <span className="text-xs">
        {formatDate(todo.createdAt)}
      </span>
    ),
    actions: (
      <div className="row-gap-1">
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          renderIcon={Edit}
          iconDescription="Edit todo"
          onClick={() => openEditModal(todo)}
          className="touch-target"
        />
        <Button
          kind="danger--ghost"
          size="sm"
          hasIconOnly
          renderIcon={TrashCan}
          iconDescription="Delete todo"
          onClick={() => openDeleteModal(todo)}
          className="touch-target"
        />
      </div>
    ),
  }));

  return (
    <div className="app-content">
      <div
        className="row-between mb-6"
      >
        <div>
          <h1 className="page-title">
            My Tasks
          </h1>
          <p className="page-subtitle">
            {todos.filter((t) => !t.completed).length} open tasks ·{' '}
            {todos.filter((t) => t.completed).length} completed
          </p>
        </div>

        <div className="row-actions">
          <Button
            renderIcon={Add}
            onClick={openCreateModal}
            className="touch-target"
          >
            Add Todo
          </Button>
        </div>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          className="mb-4"
        />
      )}

      {/* Sort controls */}
      <div
        className="sort-bar"
      >
        <span className="sort-label">Sort by:</span>
        <div className="w-180">
          <Select
            id="sort-by"
            labelText=""
            aria-label="Sort by field"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            size="sm"
            inline
          >
            <SelectItem value="createdAt" text="Creation Date" />
            <SelectItem value="dueDate" text="Due Date" />
            <SelectItem value="title" text="Title" />
          </Select>
        </div>

        <div className="w-160">
          <Select
            id="sort-order"
            labelText=""
            aria-label="Sort direction"
            value={order}
            onChange={(e) => setOrder(e.target.value as SortOrder)}
            size="sm"
            inline
          >
            <SelectItem value="desc" text="Descending" />
            <SelectItem value="asc" text="Ascending" />
          </Select>
        </div>
      </div>

      {loading ? (
        <DataTableSkeleton headers={headers} rowCount={4} />
      ) : todos.length === 0 ? (
        <Tile className="empty-tile empty-tile--lg">
          <CheckmarkOutline size={48} className="icon-success" />
          <h3 className="empty-title empty-title--lg">
            No tasks found
          </h3>
          <p className="empty-text empty-text--lg">
            You have no todos matching this filter. Create one to get started!
          </p>
          <Button renderIcon={Add} onClick={openCreateModal}>
            Create your first todo
          </Button>
        </Tile>
      ) : (
        <>
          {/* Desktop Table View (hidden on small screens) */}
          <div className="desktop-table-view desktop-table-view-hidden">
            <TableContainer title="Tasks List">
              <TableToolbar>
                <TableToolbarContent>
                  <Button renderIcon={Add} size="sm" onClick={openCreateModal}>
                    Add Todo
                  </Button>
                </TableToolbarContent>
              </TableToolbar>
              <Table aria-label="Todos table">
                <TableHead>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHeader key={h.key}>{h.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.dueDate}</TableCell>
                      <TableCell>{row.createdAt}</TableCell>
                      <TableCell>{row.actions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          {/* Responsive Card/Tile View (for mobile/tablet and universal responsive) */}
          <div className="mobile-card-view">
            {todos.map((todo) => {
              const overdue = isOverdue(todo);
              return (
                <Tile
                  key={todo._id}
                  className={`todo-card ${todo.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}
                >
                  <div
                    className="card-row"
                  >
                    <div className="card-main">
                      <Checkbox
                        id={`card-check-${todo._id}`}
                        labelText=""
                        aria-label={`Mark ${todo.title} as ${todo.completed ? 'open' : 'completed'}`}
                        checked={todo.completed}
                        onChange={() => handleToggleComplete(todo)}
                        className="mt-px"
                      />
                      <div className="flex-1">
                        <div
                          className={`todo-title ${todo.completed ? 'completed-text' : ''}`}
                        >
                          {todo.title}
                        </div>
                        {todo.description && (
                          <div className="todo-description">
                            {todo.description}
                          </div>
                        )}
                        <div className="todo-meta">
                          {todo.dueDate && (
                            <Tag
                              type={
                                todo.completed
                                  ? 'cool-gray'
                                  : overdue
                                    ? 'red'
                                    : 'blue'
                              }
                              renderIcon={overdue ? Alarm : Calendar}
                              size="sm"
                            >
                              Due: {formatDate(todo.dueDate)}
                              {overdue && !todo.completed ? ' (Overdue)' : ''}
                            </Tag>
                          )}
                          <span className="text-secondary">
                            Created: {formatDate(todo.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="row-gap-1">
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={Edit}
                        iconDescription="Edit todo"
                        onClick={() => openEditModal(todo)}
                        className="touch-target"
                      />
                      <Button
                        kind="danger--ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={TrashCan}
                        iconDescription="Delete todo"
                        onClick={() => openDeleteModal(todo)}
                        className="touch-target"
                      />
                    </div>
                  </div>
                </Tile>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={isModalOpen}
        modalHeading={modalMode === 'create' ? 'Create New Todo' : 'Edit Todo'}
        primaryButtonText={submitting ? 'Saving...' : 'Save Todo'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={submitting}
        onRequestClose={() => setIsModalOpen(false)}
        onRequestSubmit={handleModalSubmit}
      >
        <div className="modal-body-stack modal-body-stack--lg">
          {formError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={formError}
              hideCloseButton
              lowContrast
            />
          )}

          <TextInput
            id="todo-title"
            labelText="Title *"
            placeholder="e.g. Prepare presentation slides"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
            autoFocus
          />

          <TextArea
            id="todo-desc"
            labelText="Description (optional)"
            placeholder="Add detailed notes or subtasks..."
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={3}
          />

          <TextInput
            id="todo-due-date"
            labelText="Due Date (optional)"
            type="date"
            value={formDueDate}
            onChange={(e) => setFormDueDate(e.target.value)}
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        danger
        open={isDeleteModalOpen}
        modalHeading="Delete Todo Item"
        primaryButtonText={deleting ? 'Deleting...' : 'Delete'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={deleting}
        onRequestClose={() => setIsDeleteModalOpen(false)}
        onRequestSubmit={confirmDelete}
      >
        <p className="pt-4">
          Are you sure you want to delete <strong>&quot;{deleteTarget?.title}&quot;</strong>? This
          action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};
