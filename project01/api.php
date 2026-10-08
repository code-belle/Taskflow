<?php
// ===== TaskFlow API =====
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {

  // ---- GET all tasks ----
  case 'GET':
    $sql    = "SELECT * FROM tasks ORDER BY created_at DESC";
    $result = $conn->query($sql);
    $tasks  = [];
    while ($row = $result->fetch_assoc()) {
      $tasks[] = $row;
    }
    echo json_encode(['success' => true, 'tasks' => $tasks]);
    break;

  // ---- POST: create new task ----
  case 'POST':
    $data     = json_decode(file_get_contents('php://input'), true);
    $title    = trim($conn->real_escape_string($data['title'] ?? ''));
    $priority = $conn->real_escape_string($data['priority'] ?? 'Medium');
    $due_date = !empty($data['due_date']) ? "'" . $conn->real_escape_string($data['due_date']) . "'" : 'NULL';

    if (empty($title)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Title is required.']);
      break;
    }

    $sql = "INSERT INTO tasks (title, priority, due_date) VALUES ('$title', '$priority', $due_date)";
    if ($conn->query($sql)) {
      $newId = $conn->insert_id;
      $row   = $conn->query("SELECT * FROM tasks WHERE id = $newId")->fetch_assoc();
      echo json_encode(['success' => true, 'task' => $row]);
    } else {
      http_response_code(500);
      echo json_encode(['success' => false, 'error' => $conn->error]);
    }
    break;

  // ---- PUT: update task ----
  case 'PUT':
    if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'ID required']); break; }

    $data     = json_decode(file_get_contents('php://input'), true);
    $fields   = [];

    if (isset($data['title'])) {
      $title = trim($conn->real_escape_string($data['title']));
      if (empty($title)) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'Title cannot be empty.']); break; }
      $fields[] = "title='$title'";
    }
    if (isset($data['priority']))  $fields[] = "priority='" . $conn->real_escape_string($data['priority']) . "'";
    if (isset($data['due_date']))  $fields[] = !empty($data['due_date']) ? "due_date='" . $conn->real_escape_string($data['due_date']) . "'" : "due_date=NULL";
    if (isset($data['status']))    $fields[] = "status='" . $conn->real_escape_string($data['status']) . "'";

    if (empty($fields)) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'Nothing to update.']); break; }

    $sql = "UPDATE tasks SET " . implode(', ', $fields) . " WHERE id=$id";
    if ($conn->query($sql)) {
      $row = $conn->query("SELECT * FROM tasks WHERE id=$id")->fetch_assoc();
      echo json_encode(['success' => true, 'task' => $row]);
    } else {
      http_response_code(500);
      echo json_encode(['success' => false, 'error' => $conn->error]);
    }
    break;

  // ---- DELETE: remove task ----
  case 'DELETE':
    if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'ID required']); break; }

    if ($conn->query("DELETE FROM tasks WHERE id=$id")) {
      echo json_encode(['success' => true]);
    } else {
      http_response_code(500);
      echo json_encode(['success' => false, 'error' => $conn->error]);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
}

$conn->close();
?>
