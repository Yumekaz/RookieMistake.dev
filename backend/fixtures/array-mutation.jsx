// Example: Array Mutation
// This file demonstrates the array_mutation detector

// ❌ BAD: Mutating state directly in React
class TodoList extends React.Component {
  addTodo(text) {
    this.state.todos.push({ text, done: false });  // Mutates state!
    this.setState({ todos: this.state.todos });    // Won't trigger re-render properly
  }
  
  removeTodo(index) {
    this.state.todos.splice(index, 1);  // Direct mutation!
    this.forceUpdate();
  }
}

// ❌ BAD: Mutating props
function ItemList({ items }) {
  items.push({ id: 'new' });  // Never mutate props!
  items.sort((a, b) => a.id - b.id);  // .sort() mutates in place
  return items.map(i => <Item key={i.id} {...i} />);
}

// ✅ GOOD: Create new arrays instead of mutating
class TodoListFixed extends React.Component {
  addTodo(text) {
    this.setState(prevState => ({
      todos: [...prevState.todos, { text, done: false }]
    }));
  }
  
  removeTodo(index) {
    this.setState(prevState => ({
      todos: prevState.todos.filter((_, i) => i !== index)
    }));
  }
}

// ✅ GOOD: Copy before mutating
function ItemListFixed({ items }) {
  const sorted = [...items].sort((a, b) => a.id - b.id);
  return sorted.map(i => <Item key={i.id} {...i} />);
}
