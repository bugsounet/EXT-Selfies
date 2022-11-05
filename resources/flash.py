#!/usr/bin/python
import RPi.GPIO as GPIO
from time import sleep
import sys

GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(4, GPIO.OUT)
GPIO.setup(17, GPIO.OUT)
GPIO.output(17, GPIO.LOW)
GPIO.output(4, GPIO.LOW)

while True:
    GPIO.output(4, GPIO.HIGH)
    sleep(6)
    GPIO.output(17, GPIO.HIGH)
    GPIO.output(4, GPIO.HIGH)
    sleep(0.2)
    GPIO.output(17, GPIO.LOW)
    GPIO.output(4, GPIO.LOW)
    sleep(0.3)

    GPIO.cleanup ()

sys.quit (0)