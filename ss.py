import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from torch.utils.data import DataLoader, TensorDataset
import matplotlib.pyplot as plt
import pickle

# Load dataset
data = pd.read_csv('/content/drive/MyDrive/scam4.csv', encoding='utf-8')

# Ensure only two columns: 'v1' (label) and 'v2' (message)
data = data[['v1', 'v2']]

# Step 1: Check for missing or empty values in 'v2'
data['v2'].fillna('', inplace=True)

# Step 2: Check for duplicate messages
data.drop_duplicates(subset=['v2'], inplace=True)

# Step 3: Check for messages classified as 'scam' containing scam-like keywords
scam_keywords = ['prize', 'gift', 'cash', 'click', 'link', 'win', 'free', 'congratulations', 'urgent', 'limited']
has_suspicious_content = data.apply(lambda row: any(keyword in row['v2'].lower() for keyword in scam_keywords) if row['v1'].lower() == 'scam' else True, axis=1)

# Filter out scam messages that don't pass the content check
data = data[has_suspicious_content]

# Preprocess label data (v1 -> 1 for scam, 0 for ham)
y = data['v1'].apply(lambda x: 1 if x.lower() == 'scam' else 0)

# Step 4: Split dataset into training and test sets
X_train, X_test, y_train, y_test = train_test_split(data['v2'], y, test_size=0.2, random_state=42)

# Step 5: Convert text to numerical values using TF-IDF Vectorizer
vectorizer = TfidfVectorizer(max_features=5000)
X_train_vectorized = vectorizer.fit_transform(X_train)
X_test_vectorized = vectorizer.transform(X_test)

# Convert data to PyTorch tensors
X_train_tensor = torch.tensor(X_train_vectorized.toarray(), dtype=torch.float32)
y_train_tensor = torch.tensor(y_train.values, dtype=torch.float32)
X_test_tensor = torch.tensor(X_test_vectorized.toarray(), dtype=torch.float32)
y_test_tensor = torch.tensor(y_test.values, dtype=torch.float32)

# Create DataLoader
train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)

# Define the RNN model
class SMSRNN(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers):
        super(SMSRNN, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, bidirectional=True)
        self.fc = nn.Linear(hidden_size * 2, 1)  # * 2 for bidirectional
        self.dropout = nn.Dropout(0.5)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers * 2, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers * 2, x.size(0), self.hidden_size).to(x.device)

        out, _ = self.lstm(x, (h0, c0))
        out = self.dropout(out[:, -1, :])
        out = torch.sigmoid(self.fc(out))
        return out

# Define model parameters
input_size = X_train_vectorized.shape[1]
hidden_size = 128
num_layers = 2
model = SMSRNN(input_size, hidden_size, num_layers)

# Set the criterion and optimizer
criterion = nn.BCELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Early stopping parameters
patience = 5
best_loss = float('inf')
patience_counter = 0

# Train the model
epochs = 100  # Increased epochs for better training
losses = []
val_losses = []

for epoch in range(epochs):
    model.train()
    for inputs, labels in train_loader:
        inputs = inputs.unsqueeze(1)  # Add sequence dimension
        outputs = model(inputs)
        loss = criterion(outputs.squeeze(), labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        val_inputs = X_test_tensor.unsqueeze(1)  # Add sequence dimension
        val_outputs = model(val_inputs).squeeze()
        val_loss = criterion(val_outputs, y_test_tensor).item()
        val_losses.append(val_loss)

    losses.append(loss.item())
    print(f'Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.4f}, Val Loss: {val_loss:.4f}')

    if val_loss < best_loss:
        best_loss = val_loss
        patience_counter = 0
        torch.save(model.state_dict(), '/content/drive/MyDrive/best_sms_scam_detection_model.pth')
    else:
        patience_counter += 1
        if patience_counter >= patience:
            print("Early stopping triggered")
            break

# Plot the training and validation loss
plt.figure(figsize=(10, 6))
plt.plot(range(len(losses)), losses, label='Training Loss')
plt.plot(range(len(val_losses)), val_losses, label='Validation Loss')
plt.title('Training and Validation Loss')
plt.ylabel("Loss")
plt.xlabel("Epoch")
plt.legend()
plt.show()

# Evaluate the model
model.eval()
with torch.no_grad():
    val_inputs = X_test_tensor.unsqueeze(1)  # Add sequence dimension
    outputs = model(val_inputs).squeeze()
    predicted = (outputs > 0.5).float()
    accuracy = (predicted == y_test_tensor).sum().item() / y_test_tensor.shape[0]
    print(f'Accuracy: {accuracy:.4f}')

# Save the vectorizer to Google Drive
vectorizer_save_path = '/content/drive/MyDrive/sms_tfidf_vectorizer.pkl'
with open(vectorizer_save_path, 'wb') as f:
    pickle.dump(vectorizer, f)

# Prediction functions
def preprocess_sms(message, vectorizer):
    message_vectorized = vectorizer.transform([message])
    message_tensor = torch.tensor(message_vectorized.toarray(), dtype=torch.float32).unsqueeze(1)
    return message_tensor

def predict_sms(model, message_tensor):
    model.eval()
    with torch.no_grad():
        output = model(message_tensor)
        prediction = (output > 0.5).float().item()
    return prediction

def interpret_prediction(prediction):
    return 'scam' if prediction == 1 else 'ham'

def check_messages(model, messages, vectorizer):
    results = []
    for message in messages:
        message_tensor = preprocess_sms(message, vectorizer)
        prediction = predict_sms(model, message_tensor)
        result = interpret_prediction(prediction)
        results.append((message, result))
    return results

# Example new messages for testing
new_messages = [
    "URGENT: Your {bank} account ending in {account_number} has been locked. Click here to verify your identity and restore access immediately.",
    "Congratulations! You've won ${amount} in our lottery. To claim your prize, pay a processing fee of ${fee}. Reply 'YES' to proceed.",
    "Your {device} has a VIRUS! Call our Microsoft certified technicians now at 1-800-XXX-XXXX to remove it before your data is stolen.",
    "ALERT: Unauthorized login attempt detected on your {social_media} account. Click this link to secure your account now.",
    "You've been selected for an exclusive job opportunity! Earn ${amount}/week working from home. Small registration fee required. Apply now!",
    "Your {relative} is in trouble and needs ${amount} immediately. Please send money via Western Union to this account: {account_number}.",
    "FINAL NOTICE: Your {utility} bill is overdue. Pay ${amount} now to avoid service disconnection. Click here to make a payment.",
    "Your {delivery_service} package is held at customs. Pay ${amount} in fees to release it. Click here to complete the payment.",
    "Limited time offer: Get 90% off on all {product_category}! Click here to access our exclusive online store. Don't miss out!",
    "Your {bank} credit card has been charged ${amount} for a purchase you didn't make. Call this number immediately to dispute: 1-888-XXX-XXXX"
]
results = check_messages(model, new_messages, vectorizer)
print(results)
