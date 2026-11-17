Melakukan Sign up
Feature: Melakukan Sign Up
In order to membuat akun masyarakat
As a masyarakat
I want to melakukan sign up

Scenario: Sign Up berhasil
Given I am on the "/sign-up" page
When I fill in "NAMA" with "Rahmadevi"
And I fill in "EMAIL / NIK" with "rahmadevi@gmail.com"
And I fill in "PASSWORD" with "password123"
And I press "DAFTAR SEKARANG"
Then I should see that my account has been registered

Scenario: Sign Up dengan field kosong
Given I am on the "/sign-up" page
When I leave "NAMA" empty
And I leave "EMAIL / NIK" empty
And I leave "PASSWORD" empty
And I press "DAFTAR SEKARANG"
Then I should see a validation message
And I should remain on the "/sign-up" page
