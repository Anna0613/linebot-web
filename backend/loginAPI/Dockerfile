# Use an official Python runtime as the base image
FROM python:3.9-slim

# Install PostgreSQL development libraries and tools
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory in the container
WORKDIR /app

# Copy requirements.txt and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Flask application code
COPY app.py .

# Expose the port your Flask app will run on
EXPOSE 5501

# Set environment variables (optional, override in Unraid if needed)
ENV FLASK_SECRET_KEY=b03a02f4a3424a61ff02701dcec96805
ENV DB_HOST=sql.jkl921102.org
ENV DB_PORT=5432
ENV DB_NAME=LineBot_01
ENV DB_USER=11131230
ENV DB_PASS=11131230

# Command to run the Flask application
CMD ["python", "app.py"]