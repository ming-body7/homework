package com.example.demo.controller;

import com.example.demo.DemoApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.logging.Logger;

@RestController
public class TestController {


    Logger logger = Logger.getLogger(TestController.class.getName());

    @GetMapping("/test")
    public String test() {
        logger.info("test controller");
        return "Hello from Test Controller!";
    }
}