#!/bin/bash

# Путь к вашему .env файлу (обновите, если необходимо)
ENV_FILE=".env"
LOG_FILE="manage.log"

# Проверка наличия .env файла
if [ ! -f "$ENV_FILE" ]; then
    echo "Файл .env не найден. Создайте его перед запуском."
    exit 1
fi

# Загрузка переменных из .env файла
export $(grep -v '^#' $ENV_FILE | xargs)

# Проверка и установка Docker
install_docker() {
    echo "Docker не найден. Начинаю установку..."
    
    # Установка Docker
    if command -v apt-get &> /dev/null; then
        echo "Используется Ubuntu/Debian. Установка через APT..."
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg lsb-release
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    elif command -v yum &> /dev/null; then
        echo "Используется CentOS. Установка через YUM..."
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io
    else
        echo "Неизвестный пакетный менеджер. Установите Docker вручную."
        exit 1
    fi

    # Запуск Docker
    sudo systemctl start docker
    sudo systemctl enable docker

    echo "Docker успешно установлен."
}

# Проверка и установка docker-compose
install_docker_compose() {
    echo "docker-compose не найден. Начинаю установку..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "docker-compose успешно установлен."
}

# Проверка установки Docker и docker-compose
if ! command -v docker &> /dev/null; then
    install_docker
else
    echo "Docker уже установлен."
fi

if ! command -v docker-compose &> /dev/null; then
    install_docker_compose
else
    echo "docker-compose уже установлен."
fi

# Функция для инициализации проекта
initialize_project() {
    echo "Инициализация нового проекта..."
    docker-compose up --build -d &>> "$LOG_FILE" || {
        echo "Ошибка при инициализации проекта. Подробности см. в $LOG_FILE"
        exit 1
    }
    echo "Проект успешно инициализирован."
}

# Функция для обновления проекта
update_project() {
    echo "Обновление проекта..."
    git pull origin main &>> "$LOG_FILE" || {
        echo "Не удалось обновить репозиторий. Подробности см. в $LOG_FILE"
        exit 1
    }
    docker-compose down &>> "$LOG_FILE" || {
        echo "Не удалось остановить контейнеры. Подробности см. в $LOG_FILE"
        exit 1
    }
    docker-compose up --build -d &>> "$LOG_FILE" || {
        echo "Не удалось перезапустить контейнеры. Подробности см. в $LOG_FILE"
        exit 1
    }
    echo "Проект успешно обновлен."
}

# Функция для вывода состояния контейнеров
show_status() {
    echo "Состояние контейнеров:"
    docker-compose ps
}

# Функция для остановки проекта
stop_project() {
    echo "Остановка всех контейнеров..."
    docker-compose down &>> "$LOG_FILE" || {
        echo "Ошибка при остановке контейнеров. Подробности см. в $LOG_FILE"
        exit 1
    }
    echo "Все контейнеры успешно остановлены."
}

# Обработка аргументов
case $1 in
    init)
        echo "Выбрана команда: Инициализация"
        initialize_project
        ;;
    update)
        echo "Выбрана команда: Обновление"
        update_project
        ;;
    status)
        echo "Выбрана команда: Статус"
        show_status
        ;;
    stop)
        echo "Выбрана команда: Остановка"
        stop_project
        ;;
    *)
        echo "Использование: $0 [init|update|status|stop]"
        echo "  init    - Инициализировать проект с нуля"
        echo "  update  - Обновить проект (pull и перезапуск)"
        echo "  status  - Показать состояние контейнеров"
        echo "  stop    - Остановить все контейнеры"
        exit 1
        ;;
esac

echo "Операция завершена."
